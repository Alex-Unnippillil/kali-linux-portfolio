import '@testing-library/jest-dom';

// jsdom does not provide a global Image constructor which is used by
// some components (e.g. window borders). A minimal mock is sufficient
// for our tests because we only rely on the instance existing.
class ImageMock {
  constructor(width = 0, height = 0) {
    const img = document.createElement('img');
    img.width = width;
    img.height = height;
    return img;
  }
}

// @ts-ignore - allow overriding the global Image for the test env
global.Image = ImageMock as unknown as typeof Image;
