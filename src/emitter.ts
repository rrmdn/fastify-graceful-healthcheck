import { EventEmitter } from "events";
import ON_DEATH from "death";

const emitter = new EventEmitter();

ON_DEATH(() => {
  emitter.emit("death");
});

export default emitter;
