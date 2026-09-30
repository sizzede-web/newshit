import { AbsoluteFill, Html5Audio, staticFile } from "remotion";
import { COLORS } from "./brand";
import { Grain, Scene } from "./components/Motion";
import { Ambassador } from "./scenes/Ambassador";
import { DesignCheck } from "./scenes/DesignCheck";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { Process } from "./scenes/Process";
import { World } from "./scenes/World";
import { SCENES } from "./timeline";

export const BrandloLaunch: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <Scene start={SCENES.world.start} end={SCENES.world.end} z={1}>
        <World />
      </Scene>
      <Scene start={SCENES.hook.start} end={SCENES.hook.end} z={2}>
        <Hook />
      </Scene>
      <Scene start={SCENES.check.start} end={SCENES.check.end} z={3}>
        <DesignCheck />
      </Scene>
      <Scene start={SCENES.process.start} end={SCENES.process.end} z={4}>
        <Process />
      </Scene>
      <Scene start={SCENES.ambassador.start} end={SCENES.ambassador.end} z={5}>
        <Ambassador />
      </Scene>
      <Scene start={SCENES.outro.start} end={SCENES.outro.end} z={6}>
        <Outro />
      </Scene>
      <Grain opacity={0.06} />
      <Html5Audio src={staticFile("audio/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
