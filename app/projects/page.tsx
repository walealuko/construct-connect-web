"use client";

import React, { useState, useEffect, useContext, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { formatNaira } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { submitBidAction } from "@/app/actions/projects";
import {
  saveSearchAction,
  deleteSavedSearchAction,
  listSavedSearchesAction,
  type SavedSearchRow,
} from "@/app/actions/saved-searches";
import { UserContext } from "@/components/UserContext";

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  user_id: string;
  created_at: string;
  status: string;
  category?: string | null;
  state?: string | null;
}

// Client-side filter shape. Mirrors saved_searches columns. The
// "Save this search" button serializes this object into the
// saveSearchAction payload.
interface FilterState {
  category: string;
  state: string;
  minBudget: string; // string for the <input type="number">; we coerce on filter
  maxBudget: string;
}

const EMPTY_FILTER: FilterState = {
  category: "",
  state: "",
  minBudget: "",
  maxBudget: "",
};

// A filter is "set" when at least one of the four fields is
// non-empty. The Save button is only shown in that case so a
// user with a totally empty filter doesn't accidentally save a
// useless row.
function filterIsSet(f: FilterState): boolean {
  return f.category.trim() !== "" || f.state.trim() !== "" || f.minBudget.trim() !== "" || f.maxBudget.trim() !== "";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [bidModal, setBidModal] = useState({ isOpen: false, project: null as Project | null });
  const [bidForm, setBidForm] = useState({ amount: "", proposal: "" });
  const [submitting, setSubmitting] = useState(false);
  // Saved searches: a list the user can re-apply or delete. The
  // dropdown is open while this state is non-null; null means
  // the dropdown is closed (the next click should re-open it).
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[] | null>(null);
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
  // True while saveSearchAction is in flight. The button shows
  // a spinner so the user doesn't double-click.
  const [savingSearch, setSavingSearch] = useState(false);
  // Pre-fill for the save-search modal. The user can rename the
  // saved search before persisting — the default is a slug of
  // the active filters.
  const [saveModal, setSaveModal] = useState({ isOpen: false, name: "" });
  // Top-level ref to scroll back to after re-applying a saved
  // search. Without this the user lands mid-page and has to
  // scroll up to see the filter row they just clicked from.
  const topRef = useRef<HTMLDivElement | null>(null);
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;

  useEffect(() => {
    loadProjects();
  }, []);

  // Load the caller's saved searches when the user becomes
  // available. We only fetch on sign-in (or page load if already
  // signed in) — the list is small, the round-trip is cheap, and
  // the dropdown doesn't need realtime updates.
  useEffect(() => {
    if (!user) {
      setSavedSearches(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setSavedSearchesLoading(true);
      const result = await listSavedSearchesAction();
      if (cancelled) return;
      setSavedSearchesLoading(false);
      if (result.success) {
        setSavedSearches(result.items);
      } else {
        // Don't toast — the dropdown is decorative, and a
        // backend hiccup shouldn't bug the user mid-page.
        console.error("Failed to load saved searches:", result.error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We key on `user?.id` rather than the full `user` object so
    // a re-render that swaps user but keeps the same id (e.g.
    // profile refresh) doesn't re-fire the saved-searches fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Cap at 60 — same rationale as the marketplace limit.
      // PostgREST's default page size is 1000; without a cap a
      // busy category would render 1000 rows on first paint and
      // then a 60-row client re-fetch would visibly differ.
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;
      setProjects(data || []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // Apply the free-text search + filter state. Free-text matches
  // against title/description (case-insensitive substring) the
  // same way the search input did before the filters were added.
  // Category and state are exact matches. Budget is a range
  // inclusive on both ends; null budgets (the project doesn't
  // have a price tag) match when neither bound is set.
  const filteredProjects = projects.filter(p => {
    if (
      search.trim() !== "" &&
      !p.title.toLowerCase().includes(search.toLowerCase()) &&
      !p.description.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filter.category.trim() !== "" && p.category !== filter.category.trim()) {
      return false;
    }
    if (filter.state.trim() !== "" && p.state !== filter.state.trim()) {
      return false;
    }
    if (filter.minBudget.trim() !== "") {
      const min = Number(filter.minBudget);
      if (Number.isFinite(min) && (p.budget == null || p.budget < min)) {
        return false;
      }
    }
    if (filter.maxBudget.trim() !== "") {
      const max = Number(filter.maxBudget);
      if (Number.isFinite(max) && (p.budget == null || p.budget > max)) {
        return false;
      }
    }
    return true;
  });

  // Re-apply a saved search: set the filter state from the row
  // and scroll to the top so the user sees the filter row they
  // just activated. We also clear the free-text search so the
  // saved search's full filter set takes effect cleanly.
  const applySavedSearch = (row: SavedSearchRow) => {
    setFilter({
      category: row.category ?? "",
      state: row.state ?? "",
      minBudget: row.min_budget != null ? String(row.min_budget) : "",
      maxBudget: row.max_budget != null ? String(row.max_budget) : "",
    });
    setSearch("");
    // The smooth-scroll gives the user a moment to register that
    // something happened; without it, the filter row changes
    // silently and the user is left wondering.
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Open the save modal with a default name. The default is a
  // human-readable slug of the active filters so a user can
  // save and walk away; they can edit before committing.
  const openSaveModal = () => {
    const bits: string[] = [];
    if (filter.category.trim() !== "") bits.push(filter.category.trim());
    if (filter.state.trim() !== "") bits.push(filter.state.trim());
    if (filter.minBudget.trim() !== "") bits.push(`≥₦${filter.minBudget.trim()}`);
    if (filter.maxBudget.trim() !== "") bits.push(`≤₦${filter.maxBudget.trim()}`);
    if (search.trim() !== "") bits.push(`"${search.trim()}"`);
    const defaultName = bits.length > 0 ? bits.join(" · ") : "Untitled search";
    setSaveModal({ isOpen: true, name: defaultName });
  };

  const submitSave = async () => {
    const name = saveModal.name.trim();
    if (name === "") {
      toast.error("Please name this search");
      return;
    }
    setSavingSearch(true);
    const result = await saveSearchAction({
      name,
      category: filter.category.trim() || undefined,
      state: filter.state.trim() || undefined,
      min_budget: filter.minBudget.trim() !== "" ? Number(filter.minBudget) : undefined,
      max_budget: filter.maxBudget.trim() !== "" ? Number(filter.maxBudget) : undefined,
    });
    setSavingSearch(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Search saved");
    setSaveModal({ isOpen: false, name: "" });
    // Refresh the dropdown so the new row appears at the top.
    const refreshed = await listSavedSearchesAction();
    if (refreshed.success) setSavedSearches(refreshed.items);
  };

  const removeSavedSearch = async (id: string) => {
    const result = await deleteSavedSearchAction(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Search removed");
    // Optimistically drop the row from the dropdown. A full
    // re-fetch is one round-trip we don't need; the action
    // succeeded so the server view matches the local view.
    setSavedSearches((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModal.project) return;

    setSubmitting(true);
    try {
      const result = await submitBidAction({
        projectId: bidModal.project.id,
        amount: parseFloat(bidForm.amount),
        proposal: bidForm.proposal,
      });

      if (result.success) {
        toast.success("Bid submitted successfully!");
        setBidModal({ isOpen: false, project: null });
        setBidForm({ amount: "", proposal: "" });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8" ref={topRef}>
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="text-gray-500 text-sm inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex-1 text-right ml-4">
          <h1 className="text-3xl font-black text-slate-900 inline-block">Available Projects</h1>
          <p className="text-gray-500 text-sm">Find and bid on construction projects from buyers.</p>
        </div>
      </div>

      {/* Search + filter row. The free-text search stays as the
          first input (it was the only control before the filters
          were added). The four new fields sit in a wrap-friendly
          row below it; the layout collapses to a single column on
          phone-width viewports. */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label htmlFor="filter-category" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Category
            </label>
            <Input
              id="filter-category"
              placeholder="e.g. Roofing"
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label htmlFor="filter-state" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              State
            </label>
            <Input
              id="filter-state"
              placeholder="e.g. Lagos"
              value={filter.state}
              onChange={(e) => setFilter({ ...filter, state: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[110px]">
            <label htmlFor="filter-min" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Min budget (₦)
            </label>
            <Input
              id="filter-min"
              type="number"
              min={0}
              placeholder="0"
              value={filter.minBudget}
              onChange={(e) => setFilter({ ...filter, minBudget: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[110px]">
            <label htmlFor="filter-max" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Max budget (₦)
            </label>
            <Input
              id="filter-max"
              type="number"
              min={0}
              placeholder="∞"
              value={filter.maxBudget}
              onChange={(e) => setFilter({ ...filter, maxBudget: e.target.value })}
            />
          </div>

          {/* Save this search. Only shown when at least one
              filter is set AND the user is signed in. Guests
              can't save searches (no user_id to attach the row
              to). */}
          {user && filterIsSet(filter) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openSaveModal}
              className="px-4 py-2 text-sm font-bold"
            >
              Save this search
            </Button>
          )}

          {/* Clear button. Resets the four filter fields; the
              free-text search input is separate and stays
              whatever the user typed. */}
          {filterIsSet(filter) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilter(EMPTY_FILTER)}
              className="px-3 py-2 text-sm"
            >
              Clear
            </Button>
          )}

          {/* My saved searches dropdown. Only when signed in. */}
          {user && savedSearches && savedSearches.length > 0 && (
            <details className="relative ml-auto">
              <summary className="list-none cursor-pointer text-sm font-bold text-blue-600 hover:underline px-3 py-2">
                My saved searches ({savedSearches.length}) ▾
              </summary>
              <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                {savedSearches.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 p-3 border-b border-gray-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedSearch(row)}
                      className="flex-1 text-left min-w-0"
                      title="Apply this search"
                    >
                      <p className="text-sm font-bold text-slate-800 truncate">{row.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {[
                          row.category,
                          row.state,
                          row.min_budget != null ? `≥₦${row.min_budget.toLocaleString()}` : null,
                          row.max_budget != null ? `≤₦${row.max_budget.toLocaleString()}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No filters"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedSearch(row.id)}
                      aria-label={`Delete saved search ${row.name}`}
                      title="Delete"
                      className="shrink-0 w-7 h-7 rounded-full text-red-500 hover:bg-red-50 inline-flex items-center justify-center"
                    >
                      <span className="text-sm font-bold leading-none">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Show a tiny loading hint while the saved-searches
              fetch is in flight, so a returning user doesn't
              think the dropdown is missing. */}
          {user && savedSearchesLoading && (
            <span className="text-xs text-gray-400 ml-auto">Loading saved…</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="py-8 space-y-4">
            <div className="text-4xl">🏗️</div>
            <p className="text-xl text-gray-500">No projects found.</p>
            <p className="text-gray-400">Check back later for new opportunities!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-6 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {project.title}
                </h3>
                <Badge variant="info">
                  ${project.budget ? formatNaira(project.budget) : 'Negotiable'}
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                {project.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  Posted {new Date(project.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <Link href={`/messages?userId=${project.user_id}&project=${project.id}`}>Message</Link>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setBidModal({ isOpen: true, project })}
                  >
                    Submit Bid
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={bidModal.isOpen}
        onClose={() => setBidModal({ isOpen: false, project: null })}
        title="Submit Your Bid"
      >
        <form onSubmit={handleBidSubmit} className="space-y-4">
          <p className="text-sm text-slate-600 mb-4">
            You are bidding on <strong>{bidModal.project?.title}</strong>.
            Provide your best estimate and a brief proposal.
          </p>
          <Input
            type="number"
            placeholder="Your Bid Amount (₦)"
            value={bidForm.amount}
            onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Proposal</label>
            <textarea
              placeholder="Explain your approach, timeline, and expertise..."
              value={bidForm.proposal}
              onChange={(e) => setBidForm({ ...bidForm, proposal: e.target.value })}
              className="w-full p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" size="sm" onClick={() => setBidModal({ isOpen: false, project: null })}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
              isLoading={submitting}
            >
              Submit Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Save-search modal. Same Modal pattern as the bid modal
          so the styling matches. The default name is set when
          the button is clicked (see openSaveModal) so this
          component is just a thin form. */}
      <Modal
        isOpen={saveModal.isOpen}
        onClose={() => setSaveModal({ isOpen: false, name: "" })}
        title="Save this search"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitSave();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600">
            Give this search a name. We'll email you when a new project
            matches it.
          </p>
          <div className="space-y-1.5">
            <label
              htmlFor="save-search-name"
              className="text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Name
            </label>
            <Input
              id="save-search-name"
              value={saveModal.name}
              onChange={(e) => setSaveModal({ ...saveModal, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setSaveModal({ isOpen: false, name: "" })}
              disabled={savingSearch}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={savingSearch}
              disabled={savingSearch}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

