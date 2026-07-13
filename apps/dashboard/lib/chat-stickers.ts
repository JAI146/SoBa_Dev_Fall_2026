export type ChatSticker = {
  id: string;
  labelKey:
    | "chat.stickers.heart"
    | "chat.stickers.smile"
    | "chat.stickers.thumbsUp"
    | "chat.stickers.star"
    | "chat.stickers.pray"
    | "chat.stickers.flower"
    | "chat.stickers.wave"
    | "chat.stickers.thanks";
  file: string;
};

export const CHAT_STICKERS: ChatSticker[] = [
  { id: "heart", labelKey: "chat.stickers.heart", file: "/chat-stickers/heart.svg" },
  { id: "smile", labelKey: "chat.stickers.smile", file: "/chat-stickers/smile.svg" },
  {
    id: "thumbs-up",
    labelKey: "chat.stickers.thumbsUp",
    file: "/chat-stickers/thumbs-up.svg",
  },
  { id: "star", labelKey: "chat.stickers.star", file: "/chat-stickers/star.svg" },
  { id: "pray", labelKey: "chat.stickers.pray", file: "/chat-stickers/pray.svg" },
  { id: "flower", labelKey: "chat.stickers.flower", file: "/chat-stickers/flower.svg" },
  { id: "wave", labelKey: "chat.stickers.wave", file: "/chat-stickers/wave.svg" },
  { id: "thanks", labelKey: "chat.stickers.thanks", file: "/chat-stickers/thanks.svg" },
];

export async function stickerToFile(sticker: ChatSticker) {
  const response = await fetch(sticker.file);
  if (!response.ok) {
    throw new Error("Failed to load sticker");
  }
  const blob = await response.blob();
  return new File([blob], `${sticker.id}.svg`, {
    type: blob.type || "image/svg+xml",
  });
}
