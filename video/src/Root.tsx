import { Composition } from "remotion";
import { LaunchVideo, type LaunchVideoProps } from "./LaunchVideo";
import { FPS, TOTAL_FRAMES } from "./theme";

const defaultProps: LaunchVideoProps = { withAudio: false, siteLabel: "heramb.study" };

export const RemotionRoot = () => (
  <>
    <Composition id="LaunchVideo" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={defaultProps} />
    <Composition id="LaunchVideoVertical" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={defaultProps} />
    <Composition id="LaunchVideoSquare" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1080} defaultProps={defaultProps} />
  </>
);
