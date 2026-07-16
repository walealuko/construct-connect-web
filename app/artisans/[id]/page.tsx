import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import SafeImage from "@/components/ui/SafeImage";
import Link from "next/link";
import SellerRating from "@/components/SellerRating";
import ReviewButton from "@/components/ReviewButton";
import MessageSellerButton from "@/components/MessageSellerButton";

export default async function ArtisanProfile({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: artisan, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !artisan) {
    notFound();
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/artisans"
        className="text-gray-500 text-sm inline-flex items-center gap-1 mb-6 hover:text-blue-600 transition-colors"
      >
        ← Back to Artisans
      </Link>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative w-32 h-32 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gray-100">
              {artisan.avatar_url ? (
                <SafeImage src={artisan.avatar_url} alt={artisan.full_name || 'Artisan'} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🛠️</div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 px-8 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                {artisan.full_name || `${artisan.first_name || ''} ${artisan.last_name || ''}`}
              </h1>
              <p className="text-blue-600 font-bold text-lg">{artisan.tier === 'business' ? 'Professional Artisan' : 'Specialist'}</p>
              <div className="flex items-center gap-2 text-gray-500 mt-2">
                <span>📍 {artisan.location || 'Location not specified'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <MessageSellerButton sellerId={artisan.id} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h2 className="text-lg font-bold text-slate-800 mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">
                  {artisan.bio || "This artisan hasn't provided a bio yet."}
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-800 mb-3">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(artisan.bio) ? (
                    artisan.bio.map((skill: string) => (
                      <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                      Verified Professional
                    </span>
                  )}
                </div>
              </section>

              <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Reviews & Ratings</h2>
                <SellerRating sellerId={artisan.id} sellerName={artisan.full_name || 'Artisan'} />
                <div className="mt-6">
                  <ReviewButton sellerId={artisan.id} sellerName={artisan.full_name || 'Artisan'} />
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-2">Quick Action</h3>
                <p className="text-blue-600 text-xs mb-4">Have a project in mind? Start a conversation now!</p>
                <MessageSellerButton sellerId={artisan.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
