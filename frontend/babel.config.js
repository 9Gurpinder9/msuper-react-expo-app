module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // minimal config (removed reanimated plugin for isolation test)
  };
};
