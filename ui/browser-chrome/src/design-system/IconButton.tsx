import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import s from './controls.module.css';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName; label: string; iconSize?: number; size?: 'target' | 'small';
  /** Native help tag text (defaults to `label`); `false` for none. */
  tooltip?: string | false; tooltipPlacement?: 'below' | 'above'; selected?: boolean; variant?: 'plain' | 'workspace';
};

/** Borderless toolbar-style icon button (32 or 24 px target, 16/12 px glyph). Always named; native help tag by default. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, label, iconSize = 16, size = 'target', tooltip, tooltipPlacement: _p, selected, variant = 'plain', className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={tooltip === false ? undefined : (tooltip || label)}
      className={[s.iconButton, s[size], variant === 'workspace' && s.workspace, className].filter(Boolean).join(' ')}
      data-selected={selected ? 'true' : undefined}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
});
