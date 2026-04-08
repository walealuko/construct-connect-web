import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);

  // Fetch projects from Firestore on load
  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const loadedProjects = [];
      querySnapshot.forEach((doc) => {
        loadedProjects.push({ id: doc.id, ...doc.data() });
      });
      setProjects(loadedProjects);
    };
    fetchProjects();
  }, []);

  // Add new project
  const addProject = async (project) => {
    const docRef = await addDoc(collection(db, "projects"), project);
    setProjects((prev) => [...prev, { id: docRef.id, ...project }]);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}
