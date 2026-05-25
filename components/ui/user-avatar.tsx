// components/ui/user-avatar.tsx
import React from "react";

type AvatarProps = {
  name: string | null;
  image: string | null;
  userId: string;
  className?: string;
};

export function UserAvatar({ name, image, userId, className = "size-10" }: AvatarProps) {
  if (image) {
    return (
      <img 
        src={image} 
        alt={name ?? "User"} 
        className={`${className} rounded-full object-cover`}
      />
    );
  }

  const initial = name?.trim().charAt(0).toUpperCase() || "U";
  
  let hash = 0;
  const hashInput = userId || name || "";
  for (let i = 0; i < hashInput.length; i++) {
    hash = hashInput.charCodeAt(i) + ((hash << 5) - hash);
  }

  const googleColors = [
    "bg-blue-600", "bg-red-500", "bg-amber-500", "bg-emerald-600",
    "bg-purple-600", "bg-pink-600", "bg-indigo-600", "bg-teal-600"
  ];
  const bgClass = googleColors[Math.abs(hash) % googleColors.length];

  return (
    <div className={`${className} flex items-center justify-center rounded-full text-white font-medium shadow-sm ${bgClass}`}>
      {initial}
    </div>
  );
}
