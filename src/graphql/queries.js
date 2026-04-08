/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUsers = /* GraphQL */ `
  query GetUsers($id: ID!) {
    getUsers(id: $id) {
      id
      profileImage
      gallery
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUsers = /* GraphQL */ `
  query ListUsers($filter: ModelUsersFilterInput, $limit: Int, $nextToken: String) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        profileImage
        gallery
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getReviews = /* GraphQL */ `
  query GetReviews($id: ID!) {
    getReviews(id: $id) {
      id
      untitledfield
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listReviews = /* GraphQL */ `
  query ListReviews($filter: ModelReviewsFilterInput, $limit: Int, $nextToken: String) {
    listReviews(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        untitledfield
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getProducts = /* GraphQL */ `
  query GetProducts($id: ID!) {
    getProducts(id: $id) {
      id
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listProducts = /* GraphQL */ `
  query ListProducts($filter: ModelProductsFilterInput, $limit: Int, $nextToken: String) {
    listProducts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getArtisans = /* GraphQL */ `
  query GetArtisans($id: ID!) {
    getArtisans(id: $id) {
      id
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listArtisans = /* GraphQL */ `
  query ListArtisans($filter: ModelArtisansFilterInput, $limit: Int, $nextToken: String) {
    listArtisans(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSellers = /* GraphQL */ `
  query GetSellers($id: ID!) {
    getSellers(id: $id) {
      id
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listSellers = /* GraphQL */ `
  query ListSellers($filter: ModelSellersFilterInput, $limit: Int, $nextToken: String) {
    listSellers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
