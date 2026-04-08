import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div>
      {/* NAVBAR */}
      <nav style={styles.nav}>
        <h2 style={styles.logo}>ConstructConnect</h2>

        <div style={styles.links}>
          <Link to="/" style={styles.link}>
            Home
          </Link>
          <Link to="/signup" style={styles.link}>
            Sign Up
          </Link>
          <Link to="/signin" style={styles.link}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <div style={styles.container}>{children}</div>
    </div>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 40px',
    backgroundColor: '#0d6efd',
    color: 'white',
  },
  logo: {
    fontSize: '22px',
  },
  links: {
    display: 'flex',
    gap: '20px',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
  },
  container: {
    padding: '40px',
  },
};
