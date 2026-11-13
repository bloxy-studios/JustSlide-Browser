import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { useTooltip } from './tooltip';
import s from './controls.module.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName; label: string; iconSize?: number; size?: 'target' | 'small';
  tooltip?: string | false; tooltipPlacement?: 'below' | 'above'; selected?: boolean; variant?: 'plain' | 'workspace';
};

/** 32 px (or 24 px) icon-only target from the Figma navigation/dock rows. Always has an accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, iconSize = 16, size = 'target', tooltip, tooltipPlacement, selected, variant = 'plain', className, ...rest }, ref) {
  const tip = useTooltip(tooltip || label, tooltipPlacement);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={[s.iconButton, s[size], variant === 'workspace' && s.workspace, className].filter(Boolean).join(' ')}
      data-selected={selected ? 'true' : undefined}
      {...(tooltip === false ? {} : tip)}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
});
