import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Template } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hasFlowComponent(template: Template): boolean {
  return template.components.some(component => 
    component.type === 'BUTTONS' && 
    component.buttons?.some(button => button.type === 'FLOW')
  );
}

export function getFlowButtons(template: Template) {
  const buttonsComponent = template.components.find(c => c.type === 'BUTTONS');
  return buttonsComponent?.buttons?.filter(b => b.type === 'FLOW') || [];
}
