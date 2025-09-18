import wallpapers from '../../data/wallpapers.json';

export default function handler(req, res) {
  res.status(200).json(wallpapers);
}
