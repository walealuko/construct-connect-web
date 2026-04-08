import { useState } from "react";
import { useProjects } from "../context/ProjectContext";

export default function PostProject() {
  const { addProject } = useProjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) return alert("Please fill all fields");

    addProject({ title, description });
    setTitle("");
    setDescription("");
    alert("Project posted!");
  };

  return (
    <div className="container">
      <h2>Post a New Project</h2>
      <form onSubmit={handleSubmit}>
        <label>Project Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit">Post Project</button>
      </form>
    </div>
  );
}
