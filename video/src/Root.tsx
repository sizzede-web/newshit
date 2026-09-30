import { Composition, Folder, Still } from "remotion";
import { BrandloLaunch } from "./BrandloLaunch";
import { ProductShot } from "./ProductShot";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrandloLaunch"
        component={BrandloLaunch}
        durationInFrames={DURATION * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Folder name="Product-Shots">
        <Still id="shot-cup-brandlo" component={ProductShot} width={800} height={1000} defaultProps={{ product: "cup", design: "brandlo", angle: -0.2 }} />
        <Still id="shot-cup-kiez" component={ProductShot} width={800} height={1000} defaultProps={{ product: "cup", design: "kiez", angle: 0.0 }} />
        <Still id="shot-bag" component={ProductShot} width={800} height={1000} defaultProps={{ product: "bag", angle: -0.35 }} />
        <Still id="shot-bowl" component={ProductShot} width={800} height={1000} defaultProps={{ product: "bowl", angle: 0.15 }} />
      </Folder>
    </>
  );
};
