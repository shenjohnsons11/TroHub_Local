/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  displayName: "Tiện ích Chủ trọ TroHub",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.trohub.app"],
  },
});
