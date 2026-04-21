export const getInitials = (name = "") => {
  const value = String(name || "").trim();

  if (!value) {
    return "FX";
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export const buildAvatarUrl = (name = "", seed = "") => {
  const label = String(name || seed || "Fixora").trim() || "Fixora";
  const encoded = encodeURIComponent(label);

  return `https://ui-avatars.com/api/?name=${encoded}&background=12352d&color=ffffff&size=256&bold=true&rounded=true`;
};

export const resolveProfileImage = (profile = {}, fallbackName = "") => {
  return (
    profile.profileImage ||
    profile.avatar ||
    profile.image ||
    (Array.isArray(profile.images) ? profile.images[0] : null) ||
    buildAvatarUrl(profile.name || fallbackName, fallbackName)
  );
};
