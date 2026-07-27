import { AppRoute, buildAppRoute, isAppRoute, parseAppRoute } from '../../utils/routes';

const literalRoute: AppRoute<'terminal'> = buildAppRoute({ appId: 'terminal' });
const nestedRoute: AppRoute<'solitaire/index'> = buildAppRoute({ appId: 'solitaire/index' });

const dynamicId = 'weather';
const dynamicRoute = buildAppRoute({ appId: dynamicId });
const acceptsString: string = dynamicRoute;

const parsed = parseAppRoute('/apps/weather');
if (parsed) {
  const parsedId: string = parsed.appId;
  const backToRoute: AppRoute = buildAppRoute({ appId: parsedId });
}

const maybeRoute: string = '/apps/sticky_notes';
if (isAppRoute(maybeRoute)) {
  const confirmedRoute: AppRoute = maybeRoute;
}

// @ts-expect-error App id must be provided.
buildAppRoute({});

// @ts-expect-error App id cannot be empty.
buildAppRoute({ appId: '' });

// @ts-expect-error App id must not start with '/'.
buildAppRoute({ appId: '/leading-slash' });

// @ts-expect-error parseAppRoute only accepts strings.
parseAppRoute(123);
