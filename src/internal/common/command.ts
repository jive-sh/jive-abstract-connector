import { makeCicdCommandFactory, type CicdCommandFactory } from "jive-abstract-library";
import type { ConnectorModules } from "../modules";
import { layerLive } from "./layer";

export const { makeCicdCommand, makePipelineCommand, makeDeployCommand }: CicdCommandFactory<ConnectorModules> =
  makeCicdCommandFactory(layerLive);
