import { isSingleBadgeEmoji } from "@purposemint/contracts";

export function BadgeMedal({
  emoji,
  size = 56,
}: {
  emoji?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        margin: 0,
      }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        <path
          d="M53 15H77L87 54L69 67L53 15Z"
          fill="#34d399"
          stroke="#047857"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M83 15H107L91 67L73 54L83 15Z"
          fill="#6ee7b7"
          stroke="#047857"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle
          cx="80"
          cy="95"
          r="46"
          fill="#ecfdf5"
          stroke="#059669"
          strokeWidth="7"
        />
      </svg>
      {emoji && isSingleBadgeEmoji(emoji) && (
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "59.375%",
            transform: "translate(-50%, -50%)",
            fontSize: size * 0.29,
            lineHeight: 1,
            filter: "grayscale(1) sepia(1) saturate(4) hue-rotate(95deg)",
            margin: 0,
            fontFamily:
              '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
          }}
        >
          {emoji}
        </span>
      )}
    </span>
  );
}
