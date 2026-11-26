import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { packetKeyframes, PACKET_DURATION_MS } from '@/engine/packets';
import type { ActivePacket } from '@/engine/types';
import { PacketLayer } from './PacketLayer';

const lane = { x1: 0, x2: 100, y: 20 };
const request: ActivePacket = {
  key: '1:0',
  lane,
  packet: { lane: 'main', label: 'GET /items', tone: 'req' },
};
const answer: ActivePacket = {
  key: '1:1',
  lane,
  packet: { lane: 'main', label: '200 OK', tone: 'res', dir: 'back' },
};

/** jsdom has no Web Animations API, so every element gets a recording stand-in. */
function stubAnimate() {
  const made: Array<{
    animation: {
      cancel: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      play: ReturnType<typeof vi.fn>;
      playState: string;
    };
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
  }> = [];
  Element.prototype.animate = function (keyframes, options) {
    const animation = {
      cancel: vi.fn(),
      pause: vi.fn(function (this: { playState: string }) {
        this.playState = 'paused';
      }),
      play: vi.fn(function (this: { playState: string }) {
        this.playState = 'running';
      }),
      playState: 'running',
    };
    made.push({
      animation,
      keyframes: keyframes as Keyframe[],
      options: options as KeyframeAnimationOptions,
    });
    return animation as unknown as Animation;
  };
  return made;
}

afterEach(() => {
  // @ts-expect-error remove the stand-in again
  delete Element.prototype.animate;
});

function svg(ui: React.ReactNode) {
  return render(<svg>{ui}</svg>);
}

describe('PacketLayer', () => {
  it('draws each packet with its label, tone colour and an animation along its lane', () => {
    const made = stubAnimate();
    const { container } = svg(<PacketLayer packets={[request, answer]} paused={false} />);
    expect(container.textContent).toContain('GET /items');
    expect(container.textContent).toContain('200 OK');
    expect(container.querySelector('circle.fill-req')).not.toBeNull();
    expect(container.querySelector('circle.fill-res')).not.toBeNull();
    expect(made).toHaveLength(2);
    expect(made[0]!.keyframes).toEqual(packetKeyframes(lane, request.packet));
    expect(made[1]!.keyframes).toEqual(packetKeyframes(lane, answer.packet));
    expect(made[0]!.options.duration).toBe(PACKET_DURATION_MS);
  });

  it('colours packets only with token classes, never with a literal colour', () => {
    stubAnimate();
    const { container } = svg(<PacketLayer packets={[request]} paused={false} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}|rgb\(|hsl\(/i);
  });

  it('is hidden from assistive technology: the diagram text alternative speaks for it', () => {
    stubAnimate();
    const { container } = svg(<PacketLayer packets={[request]} paused={false} />);
    expect(container.querySelector('g[aria-hidden="true"]')).not.toBeNull();
  });

  it('cancels the animation when the packet is dropped, and when the layer goes', () => {
    const made = stubAnimate();
    const { rerender, unmount } = svg(<PacketLayer packets={[request, answer]} paused={false} />);
    rerender(
      <svg>
        <PacketLayer packets={[answer]} paused={false} />
      </svg>,
    );
    expect(made[0]!.animation.cancel).toHaveBeenCalledTimes(1);
    expect(made[1]!.animation.cancel).not.toHaveBeenCalled();
    unmount();
    expect(made[1]!.animation.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not restart a packet that stays while another is added', () => {
    const made = stubAnimate();
    const { rerender } = svg(<PacketLayer packets={[request]} paused={false} />);
    rerender(
      <svg>
        <PacketLayer packets={[request, answer]} paused={false} />
      </svg>,
    );
    expect(made).toHaveLength(2);
    expect(made[0]!.animation.cancel).not.toHaveBeenCalled();
  });

  it('pauses the animations in flight, and resumes them', () => {
    const made = stubAnimate();
    const { rerender } = svg(<PacketLayer packets={[request]} paused={false} />);
    rerender(
      <svg>
        <PacketLayer packets={[request]} paused />
      </svg>,
    );
    expect(made[0]!.animation.pause).toHaveBeenCalledTimes(1);
    rerender(
      <svg>
        <PacketLayer packets={[request]} paused={false} />
      </svg>,
    );
    expect(made[0]!.animation.play).toHaveBeenCalledTimes(1);
    expect(made).toHaveLength(1); // pausing never restarted the packet
  });

  it('renders the label and does not throw where the Web Animations API is missing', () => {
    const { container } = svg(<PacketLayer packets={[request]} paused />);
    expect(container.textContent).toContain('GET /items');
  });
});
