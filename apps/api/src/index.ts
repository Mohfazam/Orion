import app from "./app";
import { initSocket, initLogger } from "@repo/realtime";

const PORT = process.env.PORT || 4000;

initSocket(4001);
initLogger();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});