import { IconItemResponse } from "../record";

// List of blacklisted emojis (the ones we don't want to render anywhere)
const blacklistedEmojis = ["🧱"]

export function renderIcon(
    icon: IconItemResponse
): string {
    if (!icon) {
        return ""
    }

    // We only consider emojis for now
    if (icon.type == "emoji") {
        // Verifying is not a blacklisted emoji
        if (!blacklistedEmojis.includes(icon.emoji)) {
            return icon.emoji + " "
        }
    }

    return ""
}