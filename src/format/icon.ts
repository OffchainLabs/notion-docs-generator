import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"

// List of blacklisted emojis (the ones we don't want to render anywhere)
const blacklistedEmojis = ["🧱"]

export function renderIcon(
    icon: PageObjectResponse['icon']
): string {
    // Item is valid, but doesn't have an icon set
    if (!icon) {
        return ""
    }

    switch (icon.type) {
        case "emoji":
            // Verifying is not a blacklisted emoji
            if (!blacklistedEmojis.includes(icon.emoji)) {
                return icon.emoji + " "
            }
            console.log(`Emoji ${icon.emoji} is not supported (blacklisted) and won't render`)
            return ""

        // This is a valid icon, but we are not handling these types yet
        case "external":
        case "file":
            console.log(`Icon type ${icon.type} is not supported and won't render`)
            return ""

        default:
            return ""
    }
}