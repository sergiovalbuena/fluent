// The owner's account: every lesson and every course open, for testing the content.

const OWNER_IDS = new Set(['3c8a6d64-5446-4acb-936a-8347b2ed0344'])

export function isOwner(userId: string | null | undefined): boolean {
  return !!userId && OWNER_IDS.has(userId)
}
