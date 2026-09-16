import { useWindowDimensions } from 'react-native';

/** The widest a content column gets on a phone, in points. Never binds: the
 *  widest phone is 440pt. */
const CONTENT_MAX_WIDTH = 640;

/** The widest it gets on a tablet. 1032pt (13" portrait) less two gutters is
 *  984, so this binds only on a landscape 13" and leaves the portrait case
 *  using the screen it is on. */
const TABLET_MAX_WIDTH = 920;

/**
 * Caps and centres a screen's content column.
 *
 * This app already had the same cap inside its own `Screen` component -- and
 * `app/index.tsx` roots its screen in a raw `<View>` and never uses `Screen`,
 * so the cap was dead code. Measured on calcpair's iPad: content spanning 98%
 * of 1032pt edge to edge, with 51% of the height unused. Both of the failures
 * Ata named -- a phone layout stretched across 13 inches, and large empty
 * regions -- in one screen, with the fix already in the repo and unreachable.
 *
 * Spread onto the ScrollView's `contentContainerStyle`. Deliberately does NOT
 * centre vertically: `justifyContent: 'center'` only has slack when content is
 * shorter than the viewport, which on a 13" iPad is most screens, and that
 * leaves a phone's worth of interface floating with dead space above and below.
 */
export function useTabletColumn() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;

  return {
    width: '100%' as const,
    maxWidth: isTablet ? Math.min(width - 48, TABLET_MAX_WIDTH) : CONTENT_MAX_WIDTH,
    alignSelf: 'center' as const,
  };
}
