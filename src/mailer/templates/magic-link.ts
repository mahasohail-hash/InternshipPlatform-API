export const magicLinkTemplate = (url: string, email: string) => `
  <p>Hello ${email},</p>
  <p>Click this link to login: <a href="${url}">Login</a></p>
  <p>This link is valid for 15 minutes.</p>
`;
