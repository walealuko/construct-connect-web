import { useProjects } from "../context/ProjectContext";

export default function Dashboard() {
  const { projects } = useProjects();

  return (
    <div className="container">
      <h2>Dashboard</h2>
      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
