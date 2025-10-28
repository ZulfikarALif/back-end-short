import { ZodError } from "zod";
const schemas = (schema) => {
  return async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        ...req.params,
        ...req.query,
      };
      await schema.parseAsync(data);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = {};

        for (const issue of error.issues) {
          const field = issue.path[0];
          errorMessages[field] = issue.message;
        }
        return res.status(400).json(errorMessages);
      }

      return res.status(500).json({ message: "kesalahan validasi" });
    }
  };
};

export default schemas;
