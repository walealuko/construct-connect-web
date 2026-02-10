const signup = (email, password, role) => {
  const newUser = { email, role };
  setUser(newUser);
  localStorage.setItem("user", JSON.stringify(newUser));
};
