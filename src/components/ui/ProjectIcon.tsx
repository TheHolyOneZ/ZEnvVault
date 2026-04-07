
import React from 'react';
import {
  Folder, Rocket, Zap, Flame, Target, Lightbulb,
  Wrench, Globe, Bot, Gamepad2, Gem, Shield,
  Server, Database, Code2, Terminal, Cloud, Lock,
  Cpu, Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface IconOption {
  name: string;       
  label: string;      
  Icon: LucideIcon;
}

export const PROJECT_ICONS: IconOption[] = [
  { name: 'Folder',    label: 'Folder',    Icon: Folder   },
  { name: 'Rocket',    label: 'Rocket',    Icon: Rocket   },
  { name: 'Zap',       label: 'Zap',       Icon: Zap      },
  { name: 'Flame',     label: 'Flame',     Icon: Flame    },
  { name: 'Target',    label: 'Target',    Icon: Target   },
  { name: 'Lightbulb', label: 'Lightbulb', Icon: Lightbulb},
  { name: 'Wrench',    label: 'Wrench',    Icon: Wrench   },
  { name: 'Globe',     label: 'Globe',     Icon: Globe    },
  { name: 'Bot',       label: 'Bot / AI',  Icon: Bot      },
  { name: 'Gamepad2',  label: 'Game',      Icon: Gamepad2 },
  { name: 'Gem',       label: 'Gem',       Icon: Gem      },
  { name: 'Shield',    label: 'Shield',    Icon: Shield   },
  { name: 'Server',    label: 'Server',    Icon: Server   },
  { name: 'Database',  label: 'Database',  Icon: Database },
  { name: 'Code2',     label: 'Code',      Icon: Code2    },
  { name: 'Terminal',  label: 'Terminal',  Icon: Terminal },
  { name: 'Cloud',     label: 'Cloud',     Icon: Cloud    },
  { name: 'Lock',      label: 'Lock',      Icon: Lock     },
  { name: 'Cpu',       label: 'CPU',       Icon: Cpu      },
  { name: 'Layers',    label: 'Layers',    Icon: Layers   },
];

const ICON_MAP = new Map(PROJECT_ICONS.map((o) => [o.name, o.Icon]));

interface ProjectIconProps {
  name: string;           
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function ProjectIcon({ name, size = 14, color = 'currentColor', strokeWidth = 1.8 }: ProjectIconProps) {
  const Icon = ICON_MAP.get(name);
  if (Icon) {
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
  }
  
  return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{name}</span>;
}
