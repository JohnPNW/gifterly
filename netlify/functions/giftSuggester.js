exports.handler = async (event) =
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from the gift suggester function!" })
  };
};
