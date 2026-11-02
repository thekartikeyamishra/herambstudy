import { Composition } from "remotion";
import { LaunchVideo, type LaunchVideoProps } from "./LaunchVideo";
import { FPS, TOTAL_FRAMES } from "./theme";
import { LaunchV2, V2_FRAMES, type LaunchV2Props } from "./LaunchV2";

const v2Props: LaunchV2Props = { withVoice: true, withMusic: true, captions: true };

const defaultProps: LaunchVideoProps = { withAudio: false, siteLabel: "heramb.study" };

export const RemotionRoot = () => (
  <>
    <Composition id="LaunchVideo" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={defaultProps} />
    <Composition id="LaunchVideoVertical" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={defaultProps} />
    <Composition id="LaunchVideoSquare" component={LaunchVideo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1080} defaultProps={defaultProps} />
    <Composition id="LaunchV2" component={LaunchV2} durationInFrames={V2_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={v2Props} />
    <Composition id="LaunchV2Vertical" component={LaunchV2} durationInFrames={V2_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={v2Props} />
    <Composition id="LaunchV2Square" component={LaunchV2} durationInFrames={V2_FRAMES} fps={FPS} width={1080} height={1080} defaultProps={v2Props} />
  </>
);
