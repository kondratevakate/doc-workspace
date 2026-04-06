'use client';

import { Box, Tooltip, Typography } from '@mui/material';
import type { CaseCard } from '@/src/lib/types';
import type { AppLocale } from '@/src/lib/preferences';
import { getPatientIdentity, getResponseLabel } from '@/src/lib/patient-identity';

interface PatientAvatarProps {
  case: CaseCard;
  locale: AppLocale;
  size?: number;
  showTooltip?: boolean;
}

export function PatientAvatar({ case: c, locale, size = 36, showTooltip = true }: PatientAvatarProps) {
  const identity = getPatientIdentity(c, locale);
  const responseStatus = (c.conditionPayload?.responseStatus as string | null | undefined) ?? null;
  const currentPreventive = (c.conditionPayload?.currentPreventive as string | null | undefined) ?? null;
  const badgeSize = Math.round(size * 0.38);

  const avatarBox = (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: identity.bgColor,
        borderRadius: identity.borderRadius,
        fontSize: Math.round(size * 0.52),
        lineHeight: 1,
        userSelect: 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: `0 2px 8px ${identity.bgColor}66`,
        cursor: showTooltip ? 'default' : 'inherit',
        '&:hover': showTooltip
          ? { transform: 'scale(1.08)', boxShadow: `0 4px 16px ${identity.bgColor}99` }
          : {},
      }}
    >
      <span style={{ lineHeight: 1 }}>{identity.animal}</span>

      {/* Treatment badge — bottom-right, changes on medication switch */}
      {identity.badge !== '∅' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.96)',
            border: '1px solid rgba(22,32,36,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: badgeSize * 0.62,
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(22,32,36,0.15)',
          }}
        >
          {identity.badge}
        </Box>
      )}
    </Box>
  );

  if (!showTooltip) return avatarBox;

  const tooltipContent = (
    <Box sx={{ p: 0.5, minWidth: 148 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.25, fontSize: '0.78rem' }}>
        {identity.animal} {identity.animalName}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.88 }}>
        {getResponseLabel(responseStatus, locale)}
      </Typography>
      {currentPreventive && (
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.72, mt: 0.25 }}>
          {identity.badge} {currentPreventive}
        </Typography>
      )}
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, mt: 0.5, letterSpacing: '0.04em' }}>
        {c.caseToken} · {c.sex ?? '?'} · {c.ageBand ?? c.age ?? '—'}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      {avatarBox}
    </Tooltip>
  );
}
