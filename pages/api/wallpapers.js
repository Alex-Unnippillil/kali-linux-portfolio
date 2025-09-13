import wallpapers from '../../public/wallpapers-manifest.json';

export default function handler(req, res) {
  res.status(200).json(Object.values(wallpapers));
}
