import API from "../api";

export const fetchUsers = async () => {
  const res = await API.get("/users");
  return res.data;
};
