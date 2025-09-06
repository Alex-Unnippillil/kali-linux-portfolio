import logger from '../../utils/logger.js';

function greet(name) {
  logger.info('Hello ' + name)
}

greet('World')
