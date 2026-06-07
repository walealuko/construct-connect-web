import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  return (
    <>
      <h3>Client Panel</h3>
      <p>You can post construction projects and manage them.</p>

      <Link to="/post-project">
        <button>Post a Project</button>
      </Link>
    </>
  );
}
