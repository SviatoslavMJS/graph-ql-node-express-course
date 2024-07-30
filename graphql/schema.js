const { buildSchema } = require("graphql");

module.exports = buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    status: String!
    posts: [Post!]!
  }

  input UserInputData {
    email: String!
    name: String!
    password: String!
  }

  type AuthData {
    token: String!
    userId: String!
  }

  type PostsData {
    posts: [Post!]!
    totalCount: Int!
  }

  input PostInputData {
    _id: ID
    title: String!
    content: String!
    imageUrl: String!
  }

   input UpdatePostInputData {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
  }

  type Query {
    userStatus: User!
    posts(page: Int): PostsData!
    postDetails(postId: ID!): Post!
    login(email: String!, password: String!): AuthData!
  }

  type Mutation {
    deletePost(postId: ID!): Post!
    updateUserStatus(status: String!): User!
    createUser(userInput: UserInputData): User!
    createPost(postInput: PostInputData): Post!
    updatePost(postInput:  UpdatePostInputData): Post!
  }

  schema {
    query: Query
    mutation: Mutation
   } 
    `);
