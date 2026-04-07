/* src/config/swagger.js */
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerServerUrl = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 8080}`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Project Management System ZENTASK API",
      version: "1.0.0",
      description: "API documentation for Project Management System ZENTASK",
      contact: {
        name: "Backend Developer",
      },
    },
    servers: [
      {
        url: swaggerServerUrl,
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Message: {
          type: "object",
          properties: {
             _id: { type: "string" },
             sender: { 
                 type: "object",
                 properties: {
                     _id: { type: "string" },
                     username: { type: "string" },
                     avatar: { type: "string" }
                 }
             },
             content: { type: "string" },
             conversationId: { type: "string" },
             attachments: { type: "array", items: { type: "object" } },
             createdAt: { type: "string", format: "date-time" }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;