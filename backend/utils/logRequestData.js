export const logRequestData = (req) => {
  console.log("📥 Request snapshot:", {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    body: req.body,
    ip: req.ip
  });
};
