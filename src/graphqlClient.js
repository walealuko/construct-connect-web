import { API, graphqlOperation, Storage } from 'aws-amplify';
import * as mutations from '../src/graphql/mutations';
import * as queries from '../src/graphql/queries';

// Get all user profiles
export const listUserProfiles = async () => {
  const result = await API.graphql(graphqlOperation(queries.listUserProfiles));
  return result.data.listUserProfiles.items;
};

// Add a new gallery item
export const addGalleryItem = async (userProfileID, title, description, file) => {
  const filename = `${userProfileID}-${Date.now()}-${file.name}`;
  await Storage.put(filename, file, { contentType: file.type });
  const imageUrl = await Storage.get(filename);

  const newItem = {
    userProfileID,
    title,
    description,
    imageUrl,
  };

  await API.graphql(graphqlOperation(mutations.createGalleryItem, { input: newItem }));

  return newItem;
};
