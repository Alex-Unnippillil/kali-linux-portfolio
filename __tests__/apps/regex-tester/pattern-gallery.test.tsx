import { fireEvent, render, screen } from '@testing-library/react';
import PatternGallery, {
  PATTERN_RECIPES,
} from '@/apps/regex-tester/components/PatternGallery';
import { logEvent } from '@/utils/analytics';

jest.mock('@/utils/analytics', () => ({
  logEvent: jest.fn(),
}));

type LogEventFn = typeof logEvent;
const mockedLogEvent = logEvent as jest.MockedFunction<LogEventFn>;

const originalAnalyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;

describe('PatternGallery', () => {
  beforeEach(() => {
    mockedLogEvent.mockClear();
    if (originalAnalyticsFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = originalAnalyticsFlag;
    }
  });

  afterAll(() => {
    if (originalAnalyticsFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = originalAnalyticsFlag;
    }
  });

  it('renders the available canned patterns', () => {
    const onPatternChange = jest.fn();
    const onTestStringChange = jest.fn();

    render(
      <PatternGallery
        onPatternChange={onPatternChange}
        onTestStringChange={onTestStringChange}
      />,
    );

    PATTERN_RECIPES.forEach((recipe) => {
      expect(screen.getByText(recipe.name)).toBeInTheDocument();
      expect(screen.getByText(recipe.description)).toBeInTheDocument();
    });
  });

  it('applies a recipe and injects sample text on click', () => {
    const onPatternChange = jest.fn();
    const onTestStringChange = jest.fn();
    const onFlagsChange = jest.fn();
    const emailRecipe = PATTERN_RECIPES.find((recipe) => recipe.id === 'email');
    if (!emailRecipe) {
      throw new Error('Email recipe missing from gallery');
    }

    render(
      <PatternGallery
        onPatternChange={onPatternChange}
        onTestStringChange={onTestStringChange}
        onFlagsChange={onFlagsChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use email address pattern/i }));

    expect(onPatternChange).toHaveBeenCalledTimes(1);
    expect(onPatternChange).toHaveBeenCalledWith(emailRecipe.pattern);
    expect(onTestStringChange).toHaveBeenCalledTimes(1);
    expect(onTestStringChange).toHaveBeenCalledWith(emailRecipe.sampleText);
    expect(onFlagsChange).toHaveBeenCalledTimes(1);
    expect(onFlagsChange).toHaveBeenCalledWith(emailRecipe.flags);
  });

  it('logs an analytics event when enabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    const onPatternChange = jest.fn();
    const onTestStringChange = jest.fn();

    render(
      <PatternGallery
        onPatternChange={onPatternChange}
        onTestStringChange={onTestStringChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use email address pattern/i }));

    expect(mockedLogEvent).toHaveBeenCalledWith({
      category: 'regex_tester',
      action: 'apply_recipe',
      label: 'email',
    });
  });

  it('does not log analytics when disabled', () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false';
    const onPatternChange = jest.fn();
    const onTestStringChange = jest.fn();

    render(
      <PatternGallery
        onPatternChange={onPatternChange}
        onTestStringChange={onTestStringChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use email address pattern/i }));

    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
});
