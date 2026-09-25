// components/DynamicIcon.ts
import { iconMap } from "wbl/utils/icons";

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function DynamicIcon({
  name,
  size = 24,
  className,
  color,
                            }: DynamicIconProps) {
  const Icon = iconMap[name];

  if (!Icon) {
    console.warn(`Icon not found in Iconoir: ${name}`);
    return null;
  }

  return (
    <Icon width={size} height={size} className={className} color={color} />
  )
}