-- Gameplay atlas generated asset pack.
--
-- Run through Aseprite/MCP. This recipe creates a tagged animated .aseprite
-- source file; export is handled separately so Phaser metadata stays generated.

local function dirname(path)
  return path:match("^(.*)[/\\][^/\\]+$")
end

local function rootFromRecipePath()
  local source = debug.getinfo(1, "S").source

  if source:sub(1, 1) ~= "@" then
    return nil
  end

  local recipeDir = dirname(source:sub(2))

  if not recipeDir then
    return nil
  end

  return recipeDir .. "/../../../.."
end

local projectRoot = os.getenv("MANGROVE_ASSET_ROOT") or rootFromRecipePath()

if not projectRoot then
  error("Set MANGROVE_ASSET_ROOT to the Mangrove checkout before generating the gameplay atlas.")
end

local outputDir = projectRoot .. "/src/assets/generated"
local sourcePath = outputDir .. "/gameplay-atlas.aseprite"
local sheetPath = outputDir .. "/gameplay-atlas.png"
local exportDataPath = outputDir .. "/gameplay-atlas.json"
local manifestPath = outputDir .. "/gameplay-atlas.manifest.json"

local canvas = 64
local sprite = Sprite(canvas, canvas, ColorMode.RGB)
sprite.filename = sourcePath
sprite.gridBounds = Rectangle(0, 0, 32, 32)
sprite.layers[1].name = "generated"

local generatedLayer = sprite.layers[1]
local frameIndex = 1
local manifest = {}
local tagRanges = {}

local function rgb(hex, alpha)
  hex = hex:gsub("#", "")
  return Color {
    r = tonumber(hex:sub(1, 2), 16),
    g = tonumber(hex:sub(3, 4), 16),
    b = tonumber(hex:sub(5, 6), 16),
    a = alpha or 255
  }
end

local C = {
  none = Color { r = 0, g = 0, b = 0, a = 0 },
  shadow = rgb("#2b2430", 120),
  grass = rgb("#5f9f55"),
  grass2 = rgb("#73b66a"),
  moss = rgb("#3f7f4c"),
  plaza = rgb("#9c9885"),
  stone = rgb("#777a75"),
  dirt = rgb("#8b6b4a"),
  wood = rgb("#8a5635"),
  woodDark = rgb("#5b3427"),
  brass = rgb("#d2a447"),
  slate = rgb("#4d5967"),
  roof = rgb("#9d4a3f"),
  roofHi = rgb("#c8664e"),
  cyan = rgb("#38d6ff"),
  cyan2 = rgb("#a2f3ff"),
  blue = rgb("#2884d8"),
  amber = rgb("#ffbd4a"),
  orange = rgb("#e9782b"),
  green = rgb("#5de36d"),
  green2 = rgb("#a4ff93"),
  red = rgb("#ff4d5a"),
  red2 = rgb("#ff9aa0"),
  magenta = rgb("#db5cff"),
  pale = rgb("#b9ddff"),
  dark = rgb("#1d2633"),
  ink = rgb("#111721"),
  white = rgb("#f8f5dc"),
  ui = rgb("#3b4652"),
  ui2 = rgb("#596775")
}

local function px(img, x, y, color)
  x = math.floor(x)
  y = math.floor(y)
  if x >= 0 and y >= 0 and x < canvas and y < canvas then
    img:drawPixel(x, y, color)
  end
end

local function rect(img, x, y, w, h, color)
  for yy = y, y + h - 1 do
    for xx = x, x + w - 1 do
      px(img, xx, yy, color)
    end
  end
end

local function outline(img, x, y, w, h, color)
  rect(img, x, y, w, 1, color)
  rect(img, x, y + h - 1, w, 1, color)
  rect(img, x, y, 1, h, color)
  rect(img, x + w - 1, y, 1, h, color)
end

local function line(img, x0, y0, x1, y1, color)
  x0 = math.floor(x0)
  y0 = math.floor(y0)
  x1 = math.floor(x1)
  y1 = math.floor(y1)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    px(img, x0, y0, color)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then
      err = err + dy
      x0 = x0 + sx
    end
    if e2 <= dx then
      err = err + dx
      y0 = y0 + sy
    end
  end
end

local function circle(img, cx, cy, r, color)
  for y = -r, r do
    for x = -r, r do
      if x * x + y * y <= r * r then
        px(img, cx + x, cy + y, color)
      end
    end
  end
end

local function diamond(img, cx, cy, r, color)
  for y = -r, r do
    local width = r - math.abs(y)
    for x = -width, width do
      px(img, cx + x, cy + y, color)
    end
  end
end

local function triangle(img, x1, y1, x2, y2, x3, y3, color)
  local minX = math.floor(math.min(x1, x2, x3))
  local maxX = math.floor(math.max(x1, x2, x3))
  local minY = math.floor(math.min(y1, y2, y3))
  local maxY = math.floor(math.max(y1, y2, y3))
  local denom = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3))
  if denom == 0 then return end
  for y = minY, maxY do
    for x = minX, maxX do
      local a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denom
      local b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denom
      local c = 1 - a - b
      if a >= 0 and b >= 0 and c >= 0 then px(img, x, y, color) end
    end
  end
end

local function sparkle(img, x, y, color)
  px(img, x, y, color)
  px(img, x - 1, y, color)
  px(img, x + 1, y, color)
  px(img, x, y - 1, color)
  px(img, x, y + 1, color)
end

local function arrow(img, x, y, color, dir)
  if dir == "right" then
    line(img, x - 5, y, x + 5, y, color)
    line(img, x + 5, y, x + 1, y - 4, color)
    line(img, x + 5, y, x + 1, y + 4, color)
  elseif dir == "down" then
    line(img, x, y - 5, x, y + 5, color)
    line(img, x, y + 5, x - 4, y + 1, color)
    line(img, x, y + 5, x + 4, y + 1, color)
  elseif dir == "up" then
    line(img, x, y + 5, x, y - 5, color)
    line(img, x, y - 5, x - 4, y - 1, color)
    line(img, x, y - 5, x + 4, y - 1, color)
  else
    line(img, x + 5, y, x - 5, y, color)
    line(img, x - 5, y, x - 1, y - 4, color)
    line(img, x - 5, y, x - 1, y + 4, color)
  end
end

local function has(text, needle)
  return string.find(text, needle, 1, true) ~= nil
end

local function baseTile(img, a, b)
  rect(img, 0, 0, canvas, canvas, a)
  for i = 0, canvas, 8 do
    line(img, i, 0, i - 20, canvas, b)
  end
end

local function addCel(img)
  if frameIndex > #sprite.frames then
    sprite:newEmptyFrame(frameIndex)
  end
  sprite:newCel(generatedLayer, frameIndex, img, Point(0, 0))
  sprite.frames[frameIndex].duration = 0.11
  frameIndex = frameIndex + 1
end

local function categoryFor(name)
  local prefix = name:match("^([^-]+)-")
  return prefix or "misc"
end

local function addTag(name, frameCount, renderer)
  local first = frameIndex
  for i = 1, frameCount do
    local img = Image(sprite.spec)
    renderer(img, i, frameCount)
    addCel(img)
  end
  local last = frameIndex - 1
  table.insert(tagRanges, { id = name, from = first, to = last })
  table.insert(manifest, { id = name, category = categoryFor(name), from = first, to = last, frames = frameCount })
end

local function writeManifest()
  local file = io.open(manifestPath, "w")
  if not file then
    error("Cannot write manifest: " .. manifestPath)
  end

  file:write("{\n")
  file:write("  \"schema\": \"mangrove.asepriteAssetManifest.v1\",\n")
  file:write("  \"recipe\": \"tools/assets/aseprite/recipes/gameplay-atlas.lua\",\n")
  file:write("  \"source\": \"src/assets/generated/gameplay-atlas.aseprite\",\n")
  file:write("  \"sheet\": \"src/assets/generated/gameplay-atlas.png\",\n")
  file:write("  \"data\": \"src/assets/generated/gameplay-atlas.json\",\n")
  file:write("  \"frameSize\": { \"w\": 64, \"h\": 64 },\n")
  file:write("  \"frameDurationMs\": 110,\n")
  file:write("  \"animations\": [\n")

  for i, item in ipairs(manifest) do
    file:write("    { \"id\": \"" .. item.id .. "\", \"category\": \"" .. item.category .. "\", \"from\": " .. item.from .. ", \"to\": " .. item.to .. ", \"frames\": " .. item.frames .. " }")
    if i < #manifest then
      file:write(",")
    end
    file:write("\n")
  end

  file:write("  ]\n")
  file:write("}\n")
  file:close()
end

local function renderMap(name, img, f, total)
  if name == "map-ground-grass" then
    baseTile(img, C.grass, C.grass2)
    sparkle(img, 12 + f * 4, 17, C.green2)
    sparkle(img, 43, 40 - f, C.moss)
  elseif name == "map-ground-plaza" then
    rect(img, 0, 0, canvas, canvas, C.plaza)
    for y = 0, canvas, 16 do line(img, 0, y, canvas, y, C.stone) end
    for x = 0, canvas, 16 do line(img, x, 0, x, canvas, C.stone) end
    sparkle(img, 20 + f * 3, 20, C.white)
  elseif name:find("lane") then
    local laneColor = C.dirt
    local flow = C.cyan
    local dir = "right"
    if name == "map-lane-job" then laneColor = C.slate; flow = C.green; dir = "down" end
    if name == "map-lane-data" then laneColor = C.stone; flow = C.pale; dir = "left" end
    baseTile(img, C.grass, C.moss)
    rect(img, 0, 23, canvas, 18, laneColor)
    outline(img, 0, 23, canvas, 18, C.ink)
    for x = -12, canvas + 12, 24 do
      arrow(img, x + f * 7, 32, flow, dir)
    end
  elseif name == "map-spawn-festival-gate" then
    baseTile(img, C.grass, C.moss)
    rect(img, 14, 18, 36, 30, C.wood)
    outline(img, 14, 18, 36, 30, C.ink)
    rect(img, 23, 26, 18, 22, C.dark)
    rect(img, 17, 12 + (f % 2), 30, 8, C.roof)
    line(img, 18, 12, 32, 6, C.brass)
    line(img, 46, 12, 32, 6, C.brass)
    sparkle(img, 32, 32, C.cyan)
  elseif name == "map-exit-storage-fixed" then
    baseTile(img, C.plaza, C.stone)
    rect(img, 16, 20, 32, 28, C.slate)
    outline(img, 16, 20, 32, 28, C.ink)
    rect(img, 22, 26, 20, 16, C.dark)
    circle(img, 32, 34, 7 + f % 2, C.cyan)
    circle(img, 32, 34, 3, C.white)
  elseif has(name, "build-slot") then
    baseTile(img, C.grass, C.moss)
    local c = C.cyan
    if name:find("worker") then c = C.green end
    if name:find("queue") then c = C.amber end
    outline(img, 12 - f, 12 - f, 40 + f * 2, 40 + f * 2, c)
    rect(img, 28, 28, 8, 8, c)
  elseif name == "map-placement-preview-valid" then
    outline(img, 10 - f, 10 - f, 44 + f * 2, 44 + f * 2, C.green)
    sparkle(img, 32, 32, C.green2)
  else
    outline(img, 10 + f, 10 + f, 44 - f * 2, 44 - f * 2, C.red)
    line(img, 20, 20, 44, 44, C.red2)
    line(img, 44, 20, 20, 44, C.red2)
  end
end

local function buildingBase(img, body, roof, pulse)
  rect(img, 12, 48, 40, 5, C.shadow)
  rect(img, 9, 51, 46, 3, C.dirt)
  rect(img, 15, 24, 34, 25, body)
  outline(img, 15, 24, 34, 25, C.ink)
  rect(img, 18, 27, 28, 3, C.ui2)
  rect(img, 12, 17, 40, 10, roof)
  outline(img, 12, 17, 40, 10, C.ink)
  rect(img, 16, 14, 32, 5, C.roofHi)
  outline(img, 16, 14, 32, 5, C.ink)
  rect(img, 20, 33, 24, 12, C.dark)
  if pulse then sparkle(img, 32, 35, pulse) end
end

local function tinyOperator(img, x, y, tunic, accent, f)
  local bob = f % 2
  circle(img, x, y + bob, 3, C.brass)
  rect(img, x - 3, y + 4 + bob, 6, 7, tunic)
  outline(img, x - 3, y + 4 + bob, 6, 7, C.ink)
  px(img, x - 4, y + 8 + bob, accent)
  px(img, x + 4, y + 7 + bob, accent)
  rect(img, x - 3, y + 11 + bob, 2, 4, C.dark)
  rect(img, x + 1, y + 11 + bob, 2, 4, C.dark)
end

local function gauge(img, x, y, amount, color)
  rect(img, x, y, 20, 6, C.dark)
  outline(img, x, y, 20, 6, C.ink)
  rect(img, x + 2, y + 2, math.max(1, math.min(16, amount)), 2, color)
end

local function pennant(img, x, y, color, f)
  line(img, x, y, x, y + 12, C.ink)
  line(img, x + 1, y + 2, x + 10, y + 4 + f % 2, color)
  line(img, x + 10, y + 4 + f % 2, x + 1, y + 8, color)
end

local function packetRail(img, y, color, f)
  rect(img, 6, y + 4, 52, 4, C.dirt)
  outline(img, 6, y + 4, 52, 4, C.ink)
  for i = 0, 3 do
    diamond(img, 12 + ((i * 13 + f * 4) % 45), y, 3, color)
  end
end

local function chimney(img, x, y, color, f)
  rect(img, x, y, 7, 17, color)
  outline(img, x, y, 7, 17, C.ink)
  circle(img, x + 2 + f % 3, y - 4, 3, C.pale)
  circle(img, x + 5, y - 9 - f % 2, 4, C.pale)
end

local function renderBuilding(name, img, f, total)
  if name:find("api") then
    buildingBase(img, C.wood, C.roof, name:find("flowing") and C.cyan or nil)
    triangle(img, 12, 17, 32, 4, 52, 17, C.roof)
    line(img, 12, 17, 32, 4, C.ink)
    line(img, 32, 4, 52, 17, C.ink)
    rect(img, 8, 22, 9, 27, C.woodDark)
    outline(img, 8, 22, 9, 27, C.ink)
    rect(img, 47, 22, 9, 27, C.woodDark)
    outline(img, 47, 22, 9, 27, C.ink)
    rect(img, 23, 24, 18, 22, C.blue)
    outline(img, 23, 24, 18, 22, C.ink)
    triangle(img, 23, 24, 32, 16, 41, 24, C.cyan)
    outline(img, 23, 24, 18, 22, C.ink)
    line(img, 29, 27, 29, 43, C.cyan2)
    line(img, 35, 27, 35, 43, C.cyan)
    pennant(img, 11, 11, C.cyan, f)
    pennant(img, 49, 11, C.green2, f)
    tinyOperator(img, 50, 37, C.blue, C.cyan2, f)
    packetRail(img, 54, C.cyan2, f)
    if name:find("saturated") then
      rect(img, 18, 24, 28, 25, C.dark)
      outline(img, 18, 24, 28, 25, C.ink)
      for x = 21, 42, 7 do
        rect(img, x, 23, 3, 27, C.amber)
        outline(img, x, 23, 3, 27, C.ink)
      end
      rect(img, 14, 19, 36, 6, C.amber)
      outline(img, 14, 19, 36, 6, C.ink)
      for y = 9, 45, 12 do line(img, 7, y, 57, y + (f % 2), C.amber) end
      gauge(img, 22, 8, 15 + f % 2, C.amber)
    elseif name:find("dropping") then
      rect(img, 22, 24, 20, 22, C.dark)
      outline(img, 22, 24, 20, 22, C.ink)
      triangle(img, 19, 44, 45, 44, 32, 56, C.red)
      line(img, 19, 44, 32, 56, C.ink)
      line(img, 45, 44, 32, 56, C.ink)
      diamond(img, 49, 39 + f * 2, 5, C.red)
      line(img, 12, 20, 52, 52, C.red2)
      line(img, 52, 20, 12, 52, C.red2)
      gauge(img, 22, 8, 6, C.red)
    else
      sparkle(img, 32, 31 + f % 2, C.white)
    end
  elseif name:find("worker") then
    buildingBase(img, C.slate, C.brass, name:find("working") and C.green or nil)
    chimney(img, 45, 9, C.woodDark, f)
    rect(img, 11, 39, 42, 6, C.woodDark)
    outline(img, 11, 39, 42, 6, C.ink)
    circle(img, 32, 34, 12, C.dark)
    circle(img, 32, 34, 5, C.brass)
    for a = 0, 7 do
      local ang = (a / 8) * 6.283 + f * 0.4
      rect(img, 31 + math.cos(ang) * 13, 33 + math.sin(ang) * 13, 3, 3, C.green)
      line(img, 32, 34, 32 + math.cos(ang) * 11, 34 + math.sin(ang) * 11, C.green2)
    end
    line(img, 13, 25, 28, 14, C.brass)
    line(img, 28, 14, 40, 25, C.brass)
    tinyOperator(img, 14, 35, C.green, C.green2, f)
    if name:find("working") then
      sparkle(img, 45 - f, 25 + f % 2, C.green2)
      sparkle(img, 23 + f, 47, C.green2)
      diamond(img, 48, 38, 4, C.cyan2)
    end
    if name:find("saturated") then
      gauge(img, 22, 9, 16, C.amber)
      for x = 44, 54, 5 do diamond(img, x, 47 - f % 2, 3, C.red) end
      line(img, 17, 19, 48, 16, C.amber)
    elseif name:find("idle") then
      gauge(img, 22, 9, 5, C.green)
    end
  elseif name:find("validation") then
    buildingBase(img, C.slate, C.cyan, C.cyan2)
    triangle(img, 18, 22, 46, 22, 32, 35, C.dark)
    line(img, 18, 22, 46, 22, C.ink)
    line(img, 18, 22, 32, 35, C.ink)
    line(img, 46, 22, 32, 35, C.ink)
    rect(img, 25, 34, 14, 12, C.dark)
    outline(img, 25, 34, 14, 12, C.ink)
    line(img, 18, 24, 46, 24, C.cyan)
    line(img, 23, 31, 41, 31 + f % 2, C.cyan2)
    line(img, 23, 38, 41, 38 - f % 2, C.cyan2)
    tinyOperator(img, 13, 38, C.cyan, C.white, f)
    diamond(img, 49, 37, 4, name:find("passing") and C.green2 or C.amber)
    if name:find("rejecting") or name:find("strict") then
      rect(img, 43, 16, 16, 16, C.dark)
      outline(img, 43, 16, 16, 16, C.red)
      line(img, 45, 18, 57, 30, C.red)
      line(img, 57, 18, 45, 30, C.red)
      arrow(img, 19 - f, 48, C.red2, "left")
      line(img, 22, 52, 42, 52, C.red2)
      if name:find("strict") then
        rect(img, 19, 30, 26, 5, C.red)
        outline(img, 19, 30, 26, 5, C.ink)
        rect(img, 24, 37, 16, 4, C.red2)
        gauge(img, 22, 9, 16, C.red)
      end
    elseif name:find("quarantining") then
      rect(img, 43, 18, 16, 24, C.dark)
      outline(img, 43, 18, 16, 24, C.green2)
      for x = 47, 55, 4 do rect(img, x, 19, 2, 22, C.green2) end
      rect(img, 47, 13, 8, 8, C.dark)
      outline(img, 47, 13, 8, 8, C.green2)
      diamond(img, 50, 32 + f % 2, 4, C.amber)
    else
      rect(img, 17, 47, 30, 5, C.green)
      outline(img, 17, 47, 30, 5, C.ink)
      line(img, 23, 44, 31, 52, C.green2)
      line(img, 31, 52, 48, 32, C.green2)
    end
  elseif has(name, "db-vault") then
    buildingBase(img, C.slate, C.brass, C.pale)
    rect(img, 14, 25, 36, 24, C.dark)
    outline(img, 14, 25, 36, 24, C.ink)
    rect(img, 17, 18, 30, 8, C.brass)
    outline(img, 17, 18, 30, 8, C.ink)
    for x = 19, 45, 8 do rect(img, x, 25, 3, 24, C.slate) end
    circle(img, 32, 36, 13, C.dark)
    circle(img, 32, 36, 8, C.brass)
    circle(img, 32, 36, 3, C.pale)
    rect(img, 20, 49, 24, 4, C.ink)
    tinyOperator(img, 51, 38, C.pale, C.brass, f)
    if name:find("slow") then
      gauge(img, 22, 9, 8 + f % 2, C.amber)
      rect(img, 18, 14, 28, 8, C.amber)
      outline(img, 18, 14, 28, 8, C.ink)
      line(img, 20, 18, 43, 18 + f % 2, C.dark)
      line(img, 18, 22, 47, 22 + f % 2, C.amber)
    elseif name:find("locked") then
      rect(img, 21, 14, 22, 20, C.red)
      outline(img, 21, 14, 22, 20, C.ink)
      rect(img, 26, 8, 12, 11, C.dark)
      outline(img, 26, 8, 12, 11, C.ink)
      rect(img, 30, 23, 4, 6, C.white)
      line(img, 14, 49, 50, 13, C.red2)
    elseif name:find("inconsistent") then
      line(img, 17, 18, 47, 50, C.red)
      line(img, 47, 18, 17, 50, C.red)
      line(img, 22, 31, 31, 42, C.magenta)
      line(img, 31, 42, 42, 30, C.magenta)
      rect(img, 20, 46, 24, 4, C.red2)
    else
      rect(img, 19, 18, 26, 5, C.cyan)
      outline(img, 19, 18, 26, 5, C.ink)
      diamond(img, 20 + f * 4, 24, 3, C.cyan2)
      line(img, 21, 24, 29, 31, C.cyan2)
    end
  elseif name:find("observability") then
    buildingBase(img, C.slate, C.pale, C.cyan2)
    rect(img, 29, 8, 6, 16, C.slate)
    outline(img, 29, 8, 6, 16, C.ink)
    line(img, 32, 9, 32, 48, C.cyan)
    line(img, 18, 30 + f, 46, 22 + f, C.cyan2)
    circle(img, 32, 25, 6, C.pale)
    gauge(img, 8, 10, 12, C.cyan)
  elseif name:find("idempotency") then
    buildingBase(img, C.wood, C.pale, C.green2)
    rect(img, 20, 25, 24, 19, C.dark)
    outline(img, 20, 25, 24, 19, C.ink)
    rect(img, 23, 29, 18, 3, C.pale)
    rect(img, 23, 35, 18, 3, C.pale)
    line(img, 24, 42, 31, 48, C.green2)
    line(img, 31, 48, 43, 30, C.green2)
  elseif name:find("dlq") then
    buildingBase(img, C.woodDark, C.red, C.amber)
    rect(img, 20, 31, 24, 14, C.dark)
    outline(img, 20, 31, 24, 14, C.amber)
    line(img, 25, 38, 39, 38, C.red2)
    rect(img, 45, 42, 12, 8, C.wood)
    outline(img, 45, 42, 12, 8, C.ink)
    circle(img, 48, 51, 2, C.ink)
    circle(img, 55, 51, 2, C.ink)
  elseif name:find("cache") then
    buildingBase(img, C.wood, C.green, C.green2)
    for i = 0, 2 do
      rect(img, 20, 28 + i * 6, 24, 3, i == f % 3 and C.green2 or C.dark)
    end
    line(img, 46, 24, 56, 18 + f % 2, C.green2)
    line(img, 46, 36, 56, 30 + f % 2, C.green2)
  elseif name:find("auth") then
    buildingBase(img, C.slate, C.blue, C.cyan)
    circle(img, 32, 32, 12, C.blue)
    rect(img, 28, 29, 8, 13, C.dark)
    circle(img, 32, 27, 7, C.dark)
    rect(img, 47, 19, 6, 18, C.brass)
    circle(img, 50, 18, 4, C.brass)
  elseif has(name, "rate-limit") then
    rect(img, 5, 22, 54, 20, C.slate)
    outline(img, 5, 22, 54, 20, C.ink)
    for x = 11, 52, 10 do
      rect(img, x, 20, 4, 24 - f % 2, C.amber)
    end
    arrow(img, 32, 32, C.red, "right")
  elseif name:find("transaction") then
    baseTile(img, C.plaza, C.stone)
    rect(img, 8, 29, 48, 10, C.wood)
    outline(img, 8, 29, 48, 10, C.ink)
    circle(img, 23, 34, 7, C.pale)
    circle(img, 41, 34, 7, C.pale)
    line(img, 23, 34, 41, 34, C.green2)
  else
    buildingBase(img, C.woodDark, C.amber, nil)
    rect(img, 13, 43, 38, 7, C.wood)
    outline(img, 13, 43, 38, 7, C.ink)
    rect(img, 17, 28, 30, 18, C.dark)
    outline(img, 17, 28, 30, 18, C.ink)
    rect(img, 12, 23, 12, 21, C.wood)
    outline(img, 12, 23, 12, 21, C.ink)
    rect(img, 40, 23, 12, 21, C.wood)
    outline(img, 40, 23, 12, 21, C.ink)
    for i = 0, 4 do
      local y = 42 - i * 5
      local fill = name:find("empty") and i < 1
        or name:find("filling") and i < 2 + f % 2
        or name:find("backing") and i < 4
        or name:find("overflowing")
      rect(img, 20, y, 24, 3, fill and C.amber or C.ui)
    end
    rect(img, 11, 47 - (f % 2), 42, 3, name:find("overflowing") and C.red or C.amber)
    tinyOperator(img, 50, 39, C.amber, C.white, f)
    gauge(img, 22, 9, name:find("empty") and 3 or name:find("filling") and 9 or name:find("backing") and 14 or 16, name:find("overflowing") and C.red or C.amber)
    if name:find("overflowing") then
      rect(img, 15, 17, 34, 34, C.dark)
      outline(img, 15, 17, 34, 34, C.red)
      for i = 0, 5 do
        local x = 10 + i * 8
        circle(img, x, 49 + ((i + f) % 3), 4, i % 2 == 0 and C.red or C.amber)
      end
      line(img, 17, 54, 47, 56, C.red)
    elseif name:find("backing") then
      rect(img, 16, 15, 32, 6, C.amber)
      outline(img, 16, 15, 32, 6, C.ink)
      line(img, 16, 22, 48, 22 + f % 2, C.amber)
    elseif name:find("empty") then
      rect(img, 21, 30, 22, 13, C.dark)
      outline(img, 21, 30, 22, 13, C.ui2)
    end
  end
end

local function softCircle(img, cx, cy, r, color, alpha)
  circle(img, cx, cy, math.max(1, r), Color { r = color.red, g = color.green, b = color.blue, a = alpha or 80 })
end

local function envelope(img, cx, cy, r, body, accent)
  diamond(img, cx, cy, r, body)
  diamond(img, cx, cy, math.floor(r * 0.45), accent)
  line(img, cx - r + 2, cy, cx, cy + math.floor(r * 0.55), C.ink)
  line(img, cx + r - 2, cy, cx, cy + math.floor(r * 0.55), C.ink)
  outline(img, cx - r, cy - math.floor(r * 0.65), r * 2, math.floor(r * 1.3), C.ink)
end

local function lockbox(img, x, y, color)
  rect(img, x, y + 6, 18, 15, C.dark)
  outline(img, x, y + 6, 18, 15, color)
  rect(img, x + 5, y, 8, 8, C.dark)
  outline(img, x + 5, y, 8, 8, color)
  px(img, x + 9, y + 14, C.white)
end

local function chevronPacket(img, x, y, color, accent)
  triangle(img, x - 14, y - 8, x + 8, y, x - 14, y + 8, color)
  triangle(img, x - 4, y - 8, x + 18, y, x - 4, y + 8, accent)
  line(img, x - 14, y - 8, x + 8, y, C.ink)
  line(img, x - 14, y + 8, x + 8, y, C.ink)
  line(img, x - 4, y - 8, x + 18, y, C.ink)
  line(img, x - 4, y + 8, x + 18, y, C.ink)
end

local function hourglass(img, x, y, color)
  rect(img, x, y, 16, 4, color)
  rect(img, x, y + 22, 16, 4, color)
  line(img, x + 1, y + 4, x + 14, y + 22, color)
  line(img, x + 14, y + 4, x + 1, y + 22, color)
  rect(img, x + 6, y + 10, 4, 8, C.red)
end

local function burst(img, cx, cy, radius, color, f, spokes)
  softCircle(img, cx, cy, radius, color, 70)
  for i = 0, spokes - 1 do
    local a = (i / spokes) * 6.283 + f * 0.12
    line(img, cx + math.cos(a) * (radius - 2), cy + math.sin(a) * (radius - 2),
      cx + math.cos(a) * (radius + 6), cy + math.sin(a) * (radius + 6), color)
  end
end

local function renderPacket(name, img, f, total)
  local bob = math.sin(f) * 2
  local cx = 32
  local cy = 32 + bob
  rect(img, 18, 48, 28, 4, C.shadow)

  if name:find("poison") then
    softCircle(img, 32, 32, 18 + f % 2, C.green, 45)
    for i = 0, 7 do
      local a = (i / 8) * 6.283 + f * 0.1
      line(img, 32 + math.cos(a) * 17, 32 + math.sin(a) * 17,
        32 + math.cos(a) * 25, 32 + math.sin(a) * 25,
        i % 2 == 0 and C.red or C.green2)
    end
    diamond(img, 32, 32, 20, C.ink)
    diamond(img, 32, 32, 17, C.green)
    diamond(img, 32, 32, 7 + f % 2, C.red2)
    for i = 0, 3 do
      local a = (i / 4) * 6.283
      line(img, 32 + math.cos(a) * 12, 32 + math.sin(a) * 12,
        32 + math.cos(a) * 23, 32 + math.sin(a) * 23, C.ink)
      circle(img, 32 + math.cos(a) * 22, 32 + math.sin(a) * 22, 3, i % 2 == 0 and C.red or C.green2)
    end
    circle(img, 26, 28, 3, C.ink)
    circle(img, 38, 28, 3, C.ink)
    line(img, 24, 40, 40, 40, C.ink)
    if name:find("pinned") then
      line(img, 7, 20, 57, 44, C.slate)
      line(img, 7, 44, 57, 20, C.slate)
      line(img, 9, 22, 55, 46, C.red2)
      line(img, 9, 46, 55, 22, C.red2)
      rect(img, 12, 19, 8, 6, C.dark)
      rect(img, 44, 39, 8, 6, C.dark)
      for i = 0, 3 do circle(img, 18 + i * 9, 18 + i * 6, 2, C.brass) end
    elseif name:find("quarantined") then
      outline(img, 8, 8, 48, 48, C.green2)
      for x = 12, 52, 8 do line(img, x, 8, x, 56, C.green2) end
      lockbox(img, 40, 38, C.green2)
    else
      outline(img, 10 + f % 2, 10 + f % 2, 44 - (f % 2) * 2, 44 - (f % 2) * 2, C.red)
    end
  elseif name:find("noise") then
    softCircle(img, 32, 32, 18, C.magenta, 30)
    triangle(img, 16, 31 + f % 2, 31, 16, 49, 36, C.ink)
    triangle(img, 18, 30 + f % 2, 32, 18, 46, 35, C.magenta)
    triangle(img, 19, 45, 35, 26, 50, 48, C.ink)
    triangle(img, 21, 43, 35, 28, 47, 46, C.cyan)
    rect(img, 24, 27 + f % 2, 17, 4, C.white)
    rect(img, 19 + f % 2, 36, 26, 2, C.ink)
    rect(img, 25, 40 - f % 2, 18, 2, C.magenta)
    for i = 0, 2 do
      line(img, 17 + i * 13, 18 + ((i + f) % 2) * 5, 24 + i * 12, 25 + ((i + f) % 2) * 6, i % 2 == 0 and C.magenta or C.cyan2)
    end
    line(img, 21, 41 - f % 2, 45, 24 + f % 2, C.ink)
    if name:find("rejected") then
      line(img, 43, 18, 57, 32, C.red)
      line(img, 57, 18, 43, 32, C.red2)
      arrow(img, 21 - f, 45, C.red, "left")
    elseif name:find("quarantined") then
      lockbox(img, 40, 35, C.green2)
      outline(img, 14, 14, 36, 36, C.green2)
      for x = 18, 46, 7 do line(img, x, 14, x, 50, C.green2) end
    end
  elseif name:find("replay") then
    circle(img, 32, 34, 19, Color { r = C.pale.red, g = C.pale.green, b = C.pale.blue, a = 45 })
    outline(img, 14, 22, 26, 26, C.pale)
    envelope(img, 18 - f % 2, cy + 6, 8, Color { r = C.pale.red, g = C.pale.green, b = C.pale.blue, a = 80 }, C.cyan2)
    envelope(img, 25 - f % 2, cy + 3, 9, Color { r = C.pale.red, g = C.pale.green, b = C.pale.blue, a = 120 }, C.cyan2)
    envelope(img, 34, cy, 10, C.pale, C.cyan2)
    arrow(img, 32, 50, C.amber, "right")
    circle(img, 42, 48, 3, C.amber)
    if name:find("duplicate") then
      envelope(img, 45 + f % 2, cy - 4, 9, Color { r = C.magenta.red, g = C.magenta.green, b = C.magenta.blue, a = 150 }, C.white)
      line(img, 18, 18, 48, 48, C.red)
      line(img, 48, 18, 18, 48, C.red2)
    end
  elseif name:find("flood") then
    for i = 0, 2 do
      line(img, 2 + i * 7 + f * 2, 22 + i * 7, 23 + i * 7 + f * 2, 22 + i * 7, i == 1 and C.white or C.cyan)
    end
    chevronPacket(img, 24 + f % 2, 32, C.blue, C.cyan2)
    chevronPacket(img, 39 + f % 2, 32, C.cyan, C.white)
    chevronPacket(img, 53 + f % 2, 32, C.cyan2, C.white)
    line(img, 4 + f * 2, 24, 23 + f * 2, 24, C.white)
    line(img, 2 + f * 2, 41, 24 + f * 2, 41, C.cyan)
  elseif name:find("queued") then
    rect(img, 18, 16, 30, 31, C.dark)
    outline(img, 18, 16, 30, 31, C.ink)
    for i = 0, 2 do
      rect(img, 21, 38 - i * 7, 24, 5, C.amber)
      outline(img, 21, 38 - i * 7, 24, 5, C.ink)
    end
    envelope(img, 32, 23 + f % 2, 7, C.cyan, C.white)
    gauge(img, 43, 18, 9 + f % 3, C.red)
  elseif name:find("processing") then
    envelope(img, cx, cy, 10, C.green, C.green2)
    circle(img, 32, 32, 15, Color { r = C.green.red, g = C.green.green, b = C.green.blue, a = 55 })
    circle(img, 32, 32, 5, C.dark)
    for i = 0, 5 do
      local a = (i / 6) * 6.283 + f * 0.45
      rect(img, 31 + math.cos(a) * 17, 31 + math.sin(a) * 17, 3, 3, C.green2)
      line(img, 32, 32, 32 + math.cos(a) * 14, 32 + math.sin(a) * 14, C.green2)
    end
  elseif name:find("expiring") then
    softCircle(img, 27, cy, 15 + f % 2, C.amber, 55)
    envelope(img, 27, cy, 10, C.amber, C.white)
    hourglass(img, 43, 19, C.amber)
    line(img, 13, 17, 50, 50, C.red)
    line(img, 14, 50, 50, 17, C.red2)
    sparkle(img, 20 + f * 3, 18 + f, C.white)
  else
    envelope(img, cx, cy, 11, C.cyan, C.cyan2)
    rect(img, 25, 24 + bob, 14, 3, C.white)
    line(img, 19, 42 + f % 2, 45, 42 + f % 2, C.cyan2)
    circle(img, 47, 42 + f % 2, 2, C.green2)
    sparkle(img, 20 + f * 4, 23 + f % 2, C.white)
  end
end

local function renderEffect(name, img, f, total)
  local r = 5 + f * 3

  if has(name, "message-spawn") then
    burst(img, 32, 34, r, C.cyan, f, 8)
    rect(img, 18, 46, 28, 4, C.dark)
    envelope(img, 32, 28 + f, 7 + f % 2, C.cyan, C.white)
    arrow(img, 32, 22 + f, C.white, "down")
  elseif has(name, "message-accepted") then
    rect(img, 18, 20, 28, 24, C.dark)
    outline(img, 18, 20, 28, 24, C.cyan)
    envelope(img, 27 + f, 32, 7, C.cyan, C.white)
    line(img, 22, 38, 29, 45, C.green2)
    line(img, 29, 45, 46, 23, C.green2)
  elseif has(name, "message-queued") then
    for i = 0, 3 do
      rect(img, 18, 44 - i * 7, 28, 4, i <= f % 4 and C.amber or C.dark)
      outline(img, 18, 44 - i * 7, 28, 4, C.ink)
    end
    arrow(img, 32, 20 + f, C.amber, "down")
  elseif has(name, "worker-start") then
    circle(img, 32, 32, 10, C.dark)
    circle(img, 32, 32, 4, C.brass)
    for i = 0, 7 do
      local a = (i / 8) * 6.283 + f * 0.45
      line(img, 32, 32, 32 + math.cos(a) * 18, 32 + math.sin(a) * 18, C.green2)
    end
    sparkle(img, 44 - f, 22 + f, C.white)
  elseif name:find("ack") then
    burst(img, 32, 32, r + 5, C.green, f, 10)
    circle(img, 32, 32, 24, Color { r = C.cyan.red, g = C.cyan.green, b = C.cyan.blue, a = 40 })
    line(img, 19, 34, 28, 43, C.white)
    line(img, 28, 43, 47, 20, C.white)
    envelope(img, 20 + f * 3, 49 - f, 5, C.cyan, C.white)
  elseif name:find("drop") then
    burst(img, 32, 32, r, C.red, f, 8)
    rect(img, 20, 19, 24, 24, Color { r = C.red.red, g = C.red.green, b = C.red.blue, a = 60 })
    line(img, 17, 17, 47, 47, C.white)
    line(img, 47, 17, 17, 47, C.white)
    envelope(img, 32, 42 + f, 8, C.red, C.red2)
  elseif name:find("timeout") then
    burst(img, 32, 32, r, C.amber, f, 6)
    hourglass(img, 24, 18, C.amber)
    rect(img, 29, 32 + f, 6, 5, C.red)
  elseif name:find("overflow") then
    rect(img, 18, 19, 28, 16, C.dark)
    outline(img, 18, 19, 28, 16, C.red)
    rect(img, 21, 15, 22, 4, C.red)
    line(img, 17, 18, 47, 18, C.white)
    for i = 0, 6 do
      circle(img, 10 + i * 7, 43 + ((i + f) % 4), 4, i % 2 == 0 and C.red or C.amber)
    end
    line(img, 17, 51, 48, 53, C.red2)
  elseif name:find("backlog") then
    for i = 0, 5 do
      rect(img, 19, 48 - i * 7, 26, 4, i < 3 + f % 3 and C.amber or C.dark)
      outline(img, 19, 48 - i * 7, 26, 4, C.ink)
    end
    gauge(img, 45, 18, 14 + f % 2, C.red)
  elseif has(name, "trust-loss") then
    softCircle(img, 32, 32, 20 + f, C.red, 80)
    circle(img, 26, 28, 8, C.red)
    circle(img, 38, 28, 8, C.red)
    line(img, 18, 34, 32, 49, C.red2)
    line(img, 46, 34, 32, 49, C.red2)
    line(img, 29, 19, 36, 47, C.white)
  elseif name:find("budget") then
    softCircle(img, 32, 32, 17 + f, C.amber, 70)
    circle(img, 32, 32, 15, C.brass)
    circle(img, 32, 32, 8, C.amber)
    sparkle(img, 45 - f, 18 + f, C.white)
    sparkle(img, 18 + f, 45 - f, C.green2)
  elseif has(name, "wave-start") then
    rect(img, 8, 23, 48, 18, C.dark)
    outline(img, 8, 23, 48, 18, C.cyan)
    arrow(img, 20 + f * 3, 32, C.cyan2, "right")
    pennant(img, 11, 11, C.cyan, f)
  elseif has(name, "wave-end") then
    burst(img, 32, 32, r + 7, C.green, f, 8)
    line(img, 21, 34, 29, 43, C.green2)
    line(img, 29, 43, 47, 21, C.green2)
  elseif has(name, "validation-reject") then
    rect(img, 11, 17, 34, 30, C.dark)
    outline(img, 11, 17, 34, 30, C.cyan)
    rect(img, 14, 20, 28, 4, C.ui2)
    line(img, 16, 23, 40, 23, C.cyan2)
    line(img, 20, 32, 36, 32, C.cyan2)
    line(img, 24, 41, 32, 41, C.cyan2)
    envelope(img, 22 - f, 50 - f, 6, C.magenta, C.white)
    line(img, 45, 18, 58, 31, C.red)
    line(img, 58, 18, 45, 31, C.red2)
    arrow(img, 16 - f, 45, C.red, "left")
  elseif has(name, "validation-quarantine") or has(name, "quarantine-success") then
    rect(img, 9, 13, 46, 38, C.dark)
    outline(img, 9, 13, 46, 38, C.green2)
    for x = 15, 49, 8 do line(img, x, 13, x, 51, C.green2) end
    line(img, 14, 20, 48, 20, C.cyan2)
    line(img, 19, 30, 43, 30, C.cyan2)
    lockbox(img, 25, 28, C.green2)
    envelope(img, 33, 41 - f, 6, C.magenta, C.white)
    burst(img, 32, 32, r, C.green, f, 8)
    sparkle(img, 50 - f, 14 + f, C.white)
  elseif has(name, "too-strict") then
    rect(img, 11, 18, 42, 26, C.dark)
    outline(img, 11, 18, 42, 26, C.amber)
    line(img, 17, 31, 28, 42, C.green2)
    line(img, 28, 42, 47, 21, C.green2)
    line(img, 14, 17, 52, 52, C.red)
    line(img, 52, 17, 14, 52, C.red2)
    gauge(img, 22, 9, 16, C.red)
    envelope(img, 13 + f, 50 - f, 5, C.cyan, C.white)
  elseif has(name, "replay-duplicate") then
    circle(img, 35, 33, 23, Color { r = C.magenta.red, g = C.magenta.green, b = C.magenta.blue, a = 35 })
    envelope(img, 20, 31, 8, C.pale, C.cyan2)
    envelope(img, 34, 28 + f % 2, 8, Color { r = C.pale.red, g = C.pale.green, b = C.pale.blue, a = 130 }, C.cyan2)
    envelope(img, 48, 31, 8, C.magenta, C.white)
    outline(img, 13, 20, 42, 25, C.ink)
    arrow(img, 24, 49, C.amber, "right")
    arrow(img, 42, 49, C.amber, "right")
    line(img, 15, 17, 51, 53, C.red)
    line(img, 47, 17, 57, 27, C.red2)
  elseif has(name, "retry-loop") then
    envelope(img, 32, 32, 8, C.pale, C.cyan2)
    circle(img, 32, 32, 21, Color { r = C.amber.red, g = C.amber.green, b = C.amber.blue, a = 55 })
    for i = 0, 5 do
      local a = (i / 6) * 6.283 + f * 0.45
      arrow(img, 32 + math.cos(a) * 17, 32 + math.sin(a) * 13, C.amber, "right")
    end
    gauge(img, 21, 50, 8 + f % 6, C.red)
  elseif name:find("idempotency") then
    diamond(img, 32, 32, 17, C.dark)
    outline(img, 17, 17, 30, 30, C.cyan)
    circle(img, 32, 32, 21, Color { r = C.cyan.red, g = C.cyan.green, b = C.cyan.blue, a = 45 })
    line(img, 21, 33, 29, 42, C.green2)
    line(img, 29, 42, 47, 21, C.green2)
    envelope(img, 16 + f * 2, 50 - f, 5, C.pale, C.white)
  elseif name:find("poison") then
    softCircle(img, 32, 32, 19 + f % 2, C.green, 45)
    for i = 0, 7 do
      local a = (i / 8) * 6.283 + f * 0.14
      line(img, 32 + math.cos(a) * 17, 32 + math.sin(a) * 17,
        32 + math.cos(a) * 26, 32 + math.sin(a) * 26,
        i % 2 == 0 and C.red or C.green2)
    end
    diamond(img, 32, 32, 18, C.ink)
    diamond(img, 32, 32, 15 + f % 2, C.green)
    circle(img, 32, 32, 5 + f % 2, C.red)
    line(img, 12, 24, 52, 40, C.slate)
    line(img, 12, 40, 52, 24, C.slate)
    line(img, 18, 18, 46, 46, C.red2)
    line(img, 46, 18, 18, 46, C.red2)
  elseif name:find("db") then
    rect(img, 17, 22, 30, 25, C.slate)
    outline(img, 17, 22, 30, 25, C.ink)
    circle(img, 32, 22, 14, C.ui2)
    rect(img, 18, 22, 28, 8, C.ui2)
    circle(img, 32, 36, 9, C.pale)
    line(img, 19, 46, 45, 46, C.ink)
    if name:find("slow") then
      gauge(img, 18, 12, 8 + f % 2, C.amber)
      hourglass(img, 42, 10, C.amber)
      line(img, 14, 51, 52, 51, C.amber)
    elseif name:find("locked") then
      lockbox(img, 24, 9, C.red)
      line(img, 15, 30, 49, 30, C.red2)
      line(img, 49, 30, 43, 25, C.red2)
    elseif name:find("inconsistent") then
      line(img, 15, 17, 49, 51, C.red)
      line(img, 49, 17, 15, 51, C.red2)
      line(img, 21, 32, 32, 41, C.magenta)
      line(img, 32, 41, 44, 30, C.magenta)
      sparkle(img, 49 - f, 19 + f, C.red2)
    else
      envelope(img, 14 + f * 5, 17, 5, C.cyan, C.white)
      line(img, 22, 37, 30, 44, C.green2)
      line(img, 30, 44, 45, 25, C.green2)
    end
  elseif name:find("noise") then
    softCircle(img, 32, 32, 16 + f % 2, C.magenta, 45)
    triangle(img, 14, 29 + f % 2, 32, 14, 50, 39, C.ink)
    triangle(img, 17, 29 + f % 2, 32, 17, 47, 37, C.magenta)
    triangle(img, 20, 46, 37, 26, 53, 50, C.ink)
    triangle(img, 23, 44, 37, 28, 50, 47, C.cyan)
    rect(img, 18, 34 + f % 2, 28, 3, C.ink)
    rect(img, 22, 40 - f % 2, 23, 2, C.magenta)
    line(img, 16, 22, 29, 27 + f % 2, C.magenta)
    line(img, 37, 20, 49, 30 - f % 2, C.cyan2)
    line(img, 22, 43, 45, 25, C.ink)
  else
    burst(img, 32, 32, r + 3, C.cyan, f, 8)
    sparkle(img, 32, 32, C.white)
  end
end

local function renderBadge(name, img, f, total)
  circle(img, 32, 32, 16, C.dark)
  circle(img, 32, 32, 14, C.ui)
  local col = C.cyan
  if name:find("queue") then col = C.amber end
  if name:find("worker") then col = C.green end
  if name:find("storage") then col = C.pale end
  if name:find("validation") or name:find("strictness") then col = C.cyan end
  if name:find("retry") or name:find("backpressure") then col = C.magenta end
  if name:find("timeout") or name:find("capacity") or name:find("recovery") then col = C.amber end
  if name:find("quarantine") or name:find("constraint") or name:find("transaction") then col = C.green end
  circle(img, 32, 32, 9 + f % 2, col)
  if name:find("api") then
    rect(img, 26, 26, 12, 12, C.dark)
    rect(img, 30, 26, 4, 12, C.white)
  elseif name:find("queue") then
    rect(img, 25, 25, 14, 3, C.dark)
    rect(img, 25, 31, 14, 3, C.dark)
    rect(img, 25, 37, 14, 3, C.dark)
  elseif name:find("worker") then
    circle(img, 32, 32, 5, C.dark)
    line(img, 32, 20, 32, 44, C.dark)
    line(img, 20, 32, 44, 32, C.dark)
  elseif name:find("validation") or name:find("strictness") then
    line(img, 23, 28, 41, 28, C.dark)
    line(img, 26, 35, 38, 35, C.dark)
  elseif name:find("retry") or name:find("backpressure") then
    arrow(img, 32, 32, C.dark, "left")
  elseif name:find("capacity") then
    rect(img, 24, 24, 16, 16, C.dark)
    outline(img, 20, 20, 24, 24, C.dark)
  elseif name:find("timeout") then
    circle(img, 32, 32, 8, C.dark)
    line(img, 32, 32, 32, 25, C.white)
    line(img, 32, 32, 38, 36, C.white)
  elseif name:find("quarantine") then
    rect(img, 25, 28, 14, 12, C.dark)
    outline(img, 25, 28, 14, 12, C.white)
  elseif name:find("safety") then
    diamond(img, 32, 32, 11, C.dark)
    line(img, 25, 33, 31, 39, C.white)
    line(img, 31, 39, 41, 26, C.white)
  else
    rect(img, 25, 28, 14, 12, C.dark)
    outline(img, 25, 28, 14, 12, C.white)
  end
end

local function panelCornerBolts(img, x, y, w, h, color)
  rect(img, x + 3, y + 3, 3, 3, color)
  rect(img, x + w - 6, y + 3, 3, 3, color)
  rect(img, x + 3, y + h - 6, 3, 3, color)
  rect(img, x + w - 6, y + h - 6, 3, 3, color)
end

local function meterTrack(img, x, y, w, color, amount)
  rect(img, x, y, w, 7, C.dark)
  outline(img, x, y, w, 7, C.ink)
  rect(img, x + 2, y + 2, math.max(2, math.min(w - 4, amount)), 3, color)
  rect(img, x + w - 5, y + 1, 2, 5, C.ui2)
end

local function buttonShell(img, accent, f)
  rect(img, 7, 18, 50, 27, C.ui)
  outline(img, 7, 18, 50, 27, C.ink)
  rect(img, 9, 20, 46, 4, C.ui2)
  rect(img, 11, 25, 42, 2, accent)
  rect(img, 10, 41, 44, 2, C.dark)
  line(img, 9, 44, 55, 44, C.ink)
  panelCornerBolts(img, 7, 18, 50, 27, accent)
  if f % 3 == 1 then
    outline(img, 5, 16, 54, 31, accent)
    px(img, 5, 31, C.white)
    px(img, 58, 31, C.white)
  end
end

local function uiGlyphPlate(img, x, y, w, h, accent)
  rect(img, x, y, w, h, C.dark)
  outline(img, x, y, w, h, C.ink)
  rect(img, x + 2, y + 2, w - 4, 2, accent)
  px(img, x + 3, y + h - 4, accent)
  px(img, x + w - 4, y + h - 4, accent)
end

local function cornerBrackets(img, x, y, w, h, color, phase)
  local p = phase or 0
  line(img, x - p, y - p, x + 10, y - p, color)
  line(img, x - p, y - p, x - p, y + 10, color)
  line(img, x + w + p, y - p, x + w - 10, y - p, color)
  line(img, x + w + p, y - p, x + w + p, y + 10, color)
  line(img, x - p, y + h + p, x + 10, y + h + p, color)
  line(img, x - p, y + h + p, x - p, y + h - 10, color)
  line(img, x + w + p, y + h + p, x + w - 10, y + h + p, color)
  line(img, x + w + p, y + h + p, x + w + p, y + h - 10, color)
end

local function renderUi(name, img, f, total)
  if name == "ui-frame-hud" then
    rect(img, 2, 8, 60, 48, C.ui)
    outline(img, 2, 8, 60, 48, C.ink)
    rect(img, 4, 10, 56, 4, C.cyan)
    rect(img, 5, 15, 10, 34, C.dark)
    outline(img, 5, 15, 10, 34, C.ui2)
    circle(img, 10, 22, 3, C.red2)
    circle(img, 10, 32, 3, C.amber)
    circle(img, 10, 42, 3, C.green2)
    rect(img, 19, 17, 36, 5, C.dark)
    outline(img, 19, 17, 36, 5, C.ui2)
    rect(img, 22, 19, 9 + f % 2, 1, C.green)
    rect(img, 35, 19, 7, 1, C.amber)
    rect(img, 46, 19, 5 + f % 2, 1, C.cyan)
    meterTrack(img, 19, 26, 34, C.red, 17 - f % 2)
    meterTrack(img, 19, 36, 34, C.amber, 22 + f % 4)
    meterTrack(img, 19, 46, 34, C.green, 27 - f % 3)
    panelCornerBolts(img, 2, 8, 60, 48, C.cyan)
    for x = 17, 56, 8 do px(img, x + f % 2, 54, C.cyan2) end
  elseif name:find("panel") then
    rect(img, 5, 10, 54, 44, C.ui)
    outline(img, 5, 10, 54, 44, C.ink)
    rect(img, 7, 12, 50, 3, name:find("recap") and C.green2 or C.cyan2)
    rect(img, 9, 16, 46, 7, name:find("recap") and C.green or C.cyan)
    outline(img, 9, 14, 46, 8, C.ink)
    rect(img, 9, 50, 46, 2, C.dark)
    panelCornerBolts(img, 5, 10, 54, 44, name:find("recap") and C.green2 or C.cyan2)
    if name:find("inspector") then
      rect(img, 11, 27, 21, 3, C.pale)
      rect(img, 11, 35, 28 + f % 2, 3, C.amber)
      rect(img, 11, 43, 17 + f, 3, C.green2)
      circle(img, 46, 35, 7, C.cyan)
      circle(img, 46, 35, 3, C.dark)
      line(img, 51, 40, 56, 48, C.cyan2)
      outline(img, 39, 27, 15, 15, C.cyan)
      rect(img, 12, 18, 6, 2, C.white)
      rect(img, 21, 18, 12, 2, C.dark)
    else
      rect(img, 12, 28, 20 + f, 3, C.pale)
      rect(img, 12, 36, 27, 3, C.amber)
      rect(img, 12, 44, 33 - f % 2, 3, C.green2)
      rect(img, 42, 30, 10, 13, C.dark)
      line(img, 42, 37, 47, 43, C.green2)
      line(img, 47, 43, 55, 30, C.green2)
      rect(img, 12, 18, 7, 2, C.white)
      rect(img, 22, 18, 18, 2, C.dark)
    end
  elseif name:find("meter") and name:find("trust") then
    rect(img, 8, 18, 48, 26, C.ui)
    outline(img, 8, 18, 48, 26, C.ink)
    circle(img, 18, 31, 6, C.red2)
    line(img, 12, 34, 18, 42, C.red2)
    line(img, 24, 34, 18, 42, C.red2)
    meterTrack(img, 27, 27, 25, C.red, 19 - f * 2)
    rect(img, 43 - f, 22, 4, 20, C.white)
    line(img, 49, 18, 57, 26, C.red2)
  elseif name:find("meter") and name:find("budget") then
    rect(img, 8, 18, 48, 27, C.ui)
    outline(img, 8, 18, 48, 27, C.ink)
    rect(img, 13, 22, 38, 5, C.dark)
    rect(img, 15, 24, 22 + f % 4, 2, C.amber)
    for i = 0, 5 do
      circle(img, 15 + i * 7, 36, 4, i <= 2 + f % 3 and C.brass or C.ui2)
      px(img, 15 + i * 7, 36, C.amber)
    end
    sparkle(img, 49 - f, 20 + f, C.white)
  elseif name:find("meter") and name:find("backlog") then
    rect(img, 13, 13, 38, 38, C.dark)
    outline(img, 13, 13, 38, 38, C.ink)
    for i = 0, 5 do
      rect(img, 20, 45 - i * 6, 24, 4, i < 3 + f % 3 and C.amber or C.slate)
      outline(img, 20, 45 - i * 6, 24, 4, C.ink)
    end
    gauge(img, 42, 17, 13 + f % 2, C.red)
    line(img, 16, 18, 48, 18, C.red)
    diamond(img, 48, 18, 3, C.red2)
  elseif name:find("meter") and name:find("compute") then
    uiGlyphPlate(img, 9, 18, 46, 28, C.cyan)
    rect(img, 16, 25, 14, 14, C.slate)
    outline(img, 16, 25, 14, 14, C.cyan)
    rect(img, 34, 25, 14 + f % 4, 10, C.cyan)
    for x = 15, 49, 7 do line(img, x, 15, x, 19, C.cyan2) end
    for y = 22, 42, 6 do line(img, 53, y, 58, y, C.amber) end
    sparkle(img, 50 - f, 30, C.white)
  elseif name:find("trust") then
    softCircle(img, 32, 32, 16, C.red, 70)
    circle(img, 26, 28, 8, C.red2)
    circle(img, 38, 28, 8, C.red2)
    line(img, 20, 35, 32, 48, C.red2)
    line(img, 44, 35, 32, 48, C.red2)
    sparkle(img, 32, 23 + f, C.white)
  elseif name:find("budget") then
    circle(img, 32, 32, 16, C.brass)
    circle(img, 32, 32, 10, C.amber)
    rect(img, 29, 22, 6, 20, C.brass)
    sparkle(img, 42 - f, 22 + f, C.white)
  elseif name:find("backlog") then
    for i = 0, 4 do
      rect(img, 20, 42 - i * 6, 24, 4, i < 2 + f % 3 and C.amber or C.slate)
      outline(img, 20, 42 - i * 6, 24, 4, C.ink)
    end
    line(img, 48, 15, 48, 43, C.red)
  elseif name:find("compute") then
    rect(img, 18, 18, 28, 28, C.slate)
    outline(img, 18, 18, 28, 28, C.ink)
    rect(img, 24, 24, 16, 16, C.dark)
    for x = 14, 50, 8 do line(img, x, 14, x, 18, C.cyan) end
    for y = 16, 48, 8 do line(img, 46, y, 51, y, C.cyan2) end
    sparkle(img, 32 + f, 32, C.cyan2)
  elseif name:find("throughput") then
    rect(img, 10, 28, 44, 8, C.dark)
    outline(img, 10, 28, 44, 8, C.ink)
    arrow(img, 21 + f * 2, 32, C.cyan2, "right")
    arrow(img, 36 - f, 42, C.green2, "right")
  elseif name:find("uptime") then
    rect(img, 10, 18, 44, 30, C.dark)
    outline(img, 10, 18, 44, 30, C.green)
    line(img, 14, 40, 24, 40, C.green)
    line(img, 24, 40, 32, 24 - f % 2, C.green2)
    line(img, 32, 24 - f % 2, 42, 40, C.green)
    line(img, 42, 40, 52, 40, C.green)
  elseif name:find("complexity") then
    for i = 0, 5 do circle(img, 16 + i * 7, 22 + (i % 2) * 19, 4, i % 2 == 0 and C.magenta or C.cyan) end
    line(img, 16, 22, 51, 41, C.magenta)
    line(img, 23, 41, 44, 22, C.cyan)
    line(img, 23, 22, 37, 41, C.amber)
  elseif name:find("button") or name:find("control") then
    if has(name, "start-wave") then
      buttonShell(img, C.green, f)
      triangle(img, 23, 27, 23, 38, 38, 32, C.green2)
      outline(img, 21, 25, 20, 16, C.ink)
      arrow(img, 43, 32, C.cyan2, "right")
      sparkle(img, 47 - f, 25 + f, C.white)
    elseif has(name, "build-queue") then
      buttonShell(img, C.amber, f)
      rect(img, 19, 30, 25, 9, C.amber)
      outline(img, 19, 30, 25, 9, C.ink)
      for i = 0, 2 do rect(img, 22, 36 - i * 4, 19, 2, C.dark) end
      rect(img, 25, 24, 13, 6, C.roof)
      triangle(img, 25, 24, 32, 19, 38, 24, C.roofHi)
    elseif has(name, "worker-count") then
      buttonShell(img, C.green, f)
      tinyOperator(img, 23, 28, C.green, C.green2, f)
      rect(img, 35, 28, 14, 12, C.dark)
      outline(img, 35, 28, 14, 12, C.green)
      line(img, 39, 34, 45, 34, C.green2)
      line(img, 42, 31, 42, 37, C.green2)
    elseif name:find("upgrade") then
      buttonShell(img, C.green, f)
      arrow(img, 27, 35, C.green2, "up")
      rect(img, 35, 28, 10, 10, C.brass)
      outline(img, 35, 28, 10, 10, C.ink)
      sparkle(img, 44, 22 + f, C.white)
    elseif name:find("inspect") then
      buttonShell(img, C.cyan, f)
      circle(img, 27, 31, 8, C.cyan)
      circle(img, 27, 31, 4, C.dark)
      line(img, 33, 37, 44, 43, C.cyan2)
    elseif name:find("pause") then
      buttonShell(img, C.pale, f)
      rect(img, 22, 25, 8, 15, C.dark)
      rect(img, 34, 25, 8, 15, C.dark)
      outline(img, 22, 25, 8, 15, C.white)
      outline(img, 34, 25, 8, 15, C.white)
    elseif name:find("speed") then
      buttonShell(img, C.cyan, f)
      arrow(img, 23 + f * 2, 32, C.cyan2, "right")
      arrow(img, 36 + f, 32, C.white, "right")
    else
      buttonShell(img, C.cyan, f)
      circle(img, 24 + f * 4, 32, 5, C.green2)
      rect(img, 35, 28, 8, 8, C.cyan)
    end
  elseif name:find("delivered") then
    renderEffect("effect-ack-delivered", img, f, total)
  elseif name:find("dropped") then
    renderEffect("effect-drop", img, f, total)
  elseif has(name, "backlog-peak") then
    renderEffect("effect-backlog-saturation", img, f, total)
  else
    renderUi("ui-icon-backlog", img, f, total)
  end
end

local function renderCharacter(name, img, f, total)
  local bob = (f % 2)
  local tunic = C.cyan
  local accent = C.white
  if has(name, "queue") then tunic = C.amber; accent = C.white end
  if has(name, "worker") then tunic = C.green; accent = C.brass end
  if has(name, "validation") then tunic = C.pale; accent = C.magenta end
  if has(name, "db") then tunic = C.slate; accent = C.brass end
  if has(name, "courier") then tunic = C.roofHi; accent = C.cyan2 end
  if has(name, "maintainer") then tunic = C.slate; accent = C.amber end

  rect(img, 10, 51, 44, 4, C.shadow)
  rect(img, 18, 47, 29, 4, C.dark)
  rect(img, 12, 52, 40, 2, C.dirt)
  circle(img, 32, 20 + bob, 6, C.brass)
  rect(img, 27, 16 + bob, 10, 3, accent)
  rect(img, 26, 26 + bob, 12, 16, tunic)
  outline(img, 26, 26 + bob, 12, 16, C.ink)
  rect(img, 28, 25 + bob, 8, 3, C.dark)
  rect(img, 28, 42 + bob, 3, 8, C.dark)
  rect(img, 35, 42 + bob, 3, 8, C.dark)
  rect(img, 21 + f % 3, 30 + bob, 5, 3, accent)
  rect(img, 38 - f % 3, 30 + bob, 5, 3, accent)

  if has(name, "gate") then
    rect(img, 23, 12 + bob, 18, 5, C.blue)
    outline(img, 23, 12 + bob, 18, 5, C.ink)
    rect(img, 42, 19, 9, 20, C.blue)
    outline(img, 42, 19, 9, 20, C.ink)
    sparkle(img, 46, 20 + f * 2, C.cyan2)
    rect(img, 13, 26, 9, 17, C.woodDark)
    outline(img, 13, 26, 9, 17, C.ink)
    rect(img, 15, 21, 6, 6, C.roof)
    envelope(img, 17 + f, 45 - f % 2, 4, C.cyan, C.white)
    arrow(img, 49, 47, C.cyan2, "down")
  elseif has(name, "queue") then
    rect(img, 25, 13 + bob, 14, 5, C.amber)
    outline(img, 25, 13 + bob, 14, 5, C.ink)
    for i = 0, 2 do
      rect(img, 42, 38 - i * 7, 12, 4, i < 1 + f % 3 and C.amber or C.wood)
      outline(img, 42, 38 - i * 7, 12, 4, C.ink)
    end
    line(img, 16, 23, 24, 30, accent)
    rect(img, 13, 33, 10, 13, C.dark)
    rect(img, 15, 36, 6, 3, C.amber)
    rect(img, 12, 42, 11, 4, C.amber)
    outline(img, 12, 42, 11, 4, C.ink)
  elseif has(name, "worker") then
    rect(img, 25, 13 + bob, 14, 5, C.green)
    outline(img, 25, 13 + bob, 14, 5, C.ink)
    circle(img, 45, 31, 6, C.dark)
    circle(img, 45, 31, 3, C.brass)
    line(img, 45, 24, 45, 38, accent)
    line(img, 38, 31, 52, 31, accent)
    line(img, 40, 26, 50, 36, accent)
    line(img, 40, 36, 50, 26, accent)
    sparkle(img, 49 - f, 19 + f, C.green2)
  elseif has(name, "validation") then
    rect(img, 25, 13 + bob, 14, 5, C.pale)
    outline(img, 25, 13 + bob, 14, 5, C.ink)
    rect(img, 42, 22, 12, 17, C.dark)
    outline(img, 42, 22, 12, 17, C.cyan)
    line(img, 44, 28, 52, 28 + f % 2, accent)
    line(img, 44, 34, 52, 34 - f % 2, accent)
    line(img, 14, 24, 22, 31, C.magenta)
    diamond(img, 49, 45, 4, C.amber)
    line(img, 13, 20, 23, 20, C.cyan2)
    line(img, 16, 25, 22, 25, C.cyan2)
  elseif has(name, "db") then
    rect(img, 24, 13 + bob, 16, 5, C.slate)
    outline(img, 24, 13 + bob, 16, 5, C.ink)
    circle(img, 46, 30, 8, C.dark)
    circle(img, 46, 30, 4 + f % 2, C.brass)
    line(img, 15, 22, 24, 30, C.brass)
    rect(img, 12, 33, 12, 10, C.slate)
    outline(img, 12, 33, 12, 10, C.ink)
    lockbox(img, 43, 41, C.brass)
  elseif has(name, "courier") then
    rect(img, 25, 13 + bob, 14, 5, C.roofHi)
    outline(img, 25, 13 + bob, 14, 5, C.ink)
    rect(img, 21, 43 + bob, 5, 4, C.roofHi)
    rect(img, 39, 41 + bob, 8, 4, C.roofHi)
    line(img, 17, 34, 25, 29, C.cyan2)
    line(img, 39, 29, 52, 21, C.cyan2)
    envelope(img, 51, 17 + f, 5, C.cyan, C.white)
    arrow(img, 15 + f, 48, C.cyan2, "right")
    line(img, 8, 51, 55, 51, C.cyan)
  elseif has(name, "maintainer") then
    rect(img, 24, 13 + bob, 16, 5, C.amber)
    outline(img, 24, 13 + bob, 16, 5, C.ink)
    line(img, 18, 20, 27, 29, C.amber)
    line(img, 18, 29, 27, 20, C.amber)
    rect(img, 42, 32, 12, 11, C.dark)
    outline(img, 42, 32, 12, 11, C.amber)
    rect(img, 13, 37, 13, 8, C.woodDark)
    outline(img, 13, 37, 13, 8, C.ink)
    sparkle(img, 47, 28 + f, C.white)
  else
    sparkle(img, 45, 22 + f, accent)
  end
end

local function renderCharacterPortrait(name, img, f, total)
  local frameColor = C.cyan
  local robe = C.cyan
  local accent = C.white
  local station = "gate"

  if has(name, "queue") then frameColor = C.amber; robe = C.amber; station = "queue" end
  if has(name, "worker") then frameColor = C.green; robe = C.green; accent = C.brass; station = "worker" end
  if has(name, "validation") then frameColor = C.magenta; robe = C.pale; accent = C.magenta; station = "validation" end
  if has(name, "db") then frameColor = C.brass; robe = C.slate; accent = C.brass; station = "db" end
  if has(name, "courier") then frameColor = C.roofHi; robe = C.roofHi; accent = C.cyan2; station = "courier" end
  if has(name, "maintainer") then frameColor = C.amber; robe = C.slate; accent = C.amber; station = "maintainer" end

  rect(img, 4, 5, 56, 53, C.ui)
  outline(img, 4, 5, 56, 53, C.ink)
  outline(img, 7 + f % 2, 8 + f % 2, 50 - (f % 2) * 2, 47 - (f % 2) * 2, frameColor)
  rect(img, 9, 45, 46, 8, C.dark)
  line(img, 11, 48, 53, 48, frameColor)

  softCircle(img, 32, 26, 18, frameColor, 45)
  circle(img, 32, 24, 12, C.brass)
  rect(img, 20, 34, 24, 16, robe)
  outline(img, 20, 34, 24, 16, C.ink)
  rect(img, 24, 19, 4, 3, C.dark)
  rect(img, 36, 19, 4, 3, C.dark)
  rect(img, 29, 25 + f % 2, 6, 2, C.dark)
  rect(img, 27, 14, 11, 4, accent)
  outline(img, 27, 14, 11, 4, C.ink)

  if station == "gate" then
    rect(img, 9, 17, 8, 24, C.blue)
    outline(img, 9, 17, 8, 24, C.ink)
    arrow(img, 49, 25, C.cyan2, "down")
    envelope(img, 46, 36 - f % 2, 5, C.cyan, C.white)
  elseif station == "queue" then
    for i = 0, 3 do
      rect(img, 45, 39 - i * 6, 12, 4, i < 1 + f and C.amber or C.wood)
      outline(img, 45, 39 - i * 6, 12, 4, C.ink)
    end
    rect(img, 8, 37, 10, 8, C.dark)
    rect(img, 10, 39, 6, 3, C.amber)
  elseif station == "worker" then
    circle(img, 49, 32, 7, C.dark)
    circle(img, 49, 32, 3, C.brass)
    line(img, 49, 23, 49, 41, accent)
    line(img, 40, 32, 58, 32, accent)
    sparkle(img, 13 + f, 18 + f, C.green2)
  elseif station == "validation" then
    rect(img, 44, 20, 12, 18, C.dark)
    outline(img, 44, 20, 12, 18, C.cyan)
    line(img, 46, 27, 54, 27 + f % 2, accent)
    line(img, 46, 33, 54, 33 - f % 2, accent)
    diamond(img, 12, 33, 4, C.magenta)
  elseif station == "db" then
    circle(img, 49, 31, 9, C.dark)
    circle(img, 49, 31, 4 + f % 2, C.brass)
    lockbox(img, 9, 35, C.brass)
    line(img, 11, 17, 18, 24, C.brass)
  elseif station == "courier" then
    envelope(img, 48, 20 + f, 6, C.cyan, C.white)
    arrow(img, 12 + f * 2, 40, C.cyan2, "right")
    line(img, 8, 44, 56, 44, C.cyan)
    rect(img, 42, 35, 10, 4, C.roofHi)
  elseif station == "maintainer" then
    line(img, 10, 18, 18, 27, C.amber)
    line(img, 10, 27, 18, 18, C.amber)
    rect(img, 44, 35, 12, 10, C.dark)
    outline(img, 44, 35, 12, 10, C.amber)
    sparkle(img, 50, 28 + f, C.white)
  end
end

local function renderProp(name, img, f, total)
  if has(name, "clock-bell-tower") then
    baseTile(img, C.plaza, C.stone)
    rect(img, 22, 18, 20, 34, C.slate)
    outline(img, 22, 18, 20, 34, C.ink)
    rect(img, 18, 12, 28, 8, C.roof)
    outline(img, 18, 12, 28, 8, C.ink)
    circle(img, 32, 28, 8, C.brass)
    line(img, 32, 28, 32, 22 + f % 3, C.dark)
    line(img, 32, 28, 38 - f % 3, 32, C.dark)
    circle(img, 32, 46, 5 + f % 2, C.amber)
  elseif has(name, "guild-notice-board") then
    baseTile(img, C.grass, C.moss)
    rect(img, 14, 20, 36, 24, C.woodDark)
    outline(img, 14, 20, 36, 24, C.ink)
    rect(img, 18, 24, 10, 8, C.pale)
    rect(img, 31, 24, 14, 5, C.amber)
    rect(img, 20, 35, 24, 4 + f % 2, C.cyan)
    rect(img, 19, 44, 4, 10, C.wood)
    rect(img, 41, 44, 4, 10, C.wood)
  elseif has(name, "archive-cart") then
    rect(img, 10, 31, 42, 17, C.wood)
    outline(img, 10, 31, 42, 17, C.ink)
    for i = 0, 2 do
      rect(img, 15 + i * 11, 23 - (i + f) % 2, 9, 12, i == 1 and C.pale or C.amber)
      outline(img, 15 + i * 11, 23 - (i + f) % 2, 9, 12, C.ink)
    end
    circle(img, 18, 49, 5, C.dark)
    circle(img, 44, 49, 5, C.dark)
    sparkle(img, 48, 22 + f, C.cyan2)
  elseif has(name, "canal-bridge") then
    rect(img, 0, 34, canvas, 18, C.blue)
    for x = -8, canvas, 13 do line(img, x + f * 2, 43, x + 8 + f * 2, 43, C.cyan2) end
    rect(img, 8, 25, 48, 13, C.wood)
    outline(img, 8, 25, 48, 13, C.ink)
    for x = 10, 52, 7 do line(img, x, 25, x + 5, 37, C.woodDark) end
    rect(img, 12, 21, 4, 23, C.woodDark)
    rect(img, 48, 21, 4, 23, C.woodDark)
    line(img, 14, 21, 50, 21 + f % 2, C.brass)
    circle(img, 14, 19, 4 + f % 2, C.amber)
    circle(img, 50, 20, 4 + (f + 1) % 2, C.cyan)
    envelope(img, 28 + f * 3, 43, 4, C.cyan, C.white)
  elseif has(name, "rooftop-relay") then
    rect(img, 0, 0, canvas, canvas, C.dark)
    rect(img, 6, 33, 52, 19, C.slate)
    outline(img, 6, 33, 52, 19, C.ink)
    for x = 10, 54, 11 do rect(img, x, 27, 7, 7, C.roof) end
    rect(img, 30, 16, 5, 24, C.woodDark)
    diamond(img, 32, 15, 6 + f % 2, C.cyan)
    line(img, 32, 15, 9, 25 + f % 2, C.cyan2)
    line(img, 32, 15, 56, 21 - f % 2, C.green2)
    circle(img, 12, 25 + f % 2, 3, C.amber)
    circle(img, 54, 21 - f % 2, 3, C.cyan)
  elseif has(name, "debug-market-stall") then
    renderProp("prop-festival-stall", img, f, total)
    rect(img, 17, 29, 30, 5, C.dark)
    line(img, 20, 32, 28, 32, C.green2)
    line(img, 32, 32, 43, 32, C.red2)
    sparkle(img, 48, 18 + f, C.magenta)
  elseif name:find("lantern") then
    rect(img, 30, 12, 4, 36, C.woodDark)
    line(img, 20, 16, 44, 16, C.brass)
    circle(img, 22, 24, 7 + f % 2, C.cyan)
    circle(img, 42, 24, 7 + (f + 1) % 2, C.amber)
    rect(img, 14, 48, 36, 3, C.shadow)
  elseif has(name, "signal-post") then
    rect(img, 30, 15, 5, 36, C.slate)
    rect(img, 18, 13, 28, 12, C.dark)
    outline(img, 18, 13, 28, 12, C.ink)
    arrow(img, 32 + f, 19, C.cyan2, "right")
    sparkle(img, 46, 12 + f, C.green2)
  elseif name:find("stall") then
    rect(img, 12, 25, 40, 24, C.wood)
    outline(img, 12, 25, 40, 24, C.ink)
    for x = 10, 48, 10 do
      rect(img, x, 17 + f % 2, 10, 8, (x / 10) % 2 == 0 and C.roof or C.brass)
    end
    circle(img, 24, 37, 4, C.cyan)
    circle(img, 39, 38, 4, C.green)
  elseif has(name, "queue-crates") then
    for i = 0, 3 do
      local y = 42 - i * 8
      rect(img, 18 + (i % 2) * 9, y, 24, 6, i < f and C.amber or C.wood)
      outline(img, 18 + (i % 2) * 9, y, 24, 6, C.ink)
    end
  elseif has(name, "cable-vines") then
    line(img, 7, 43, 58, 19, C.green)
    line(img, 5, 48, 59, 32, C.cyan)
    for x = 12, 52, 10 do circle(img, x, 43 - (x % 3) * 3, 3 + f % 2, C.green2) end
  elseif has(name, "bench-terminal") then
    rect(img, 12, 38, 38, 8, C.wood)
    outline(img, 12, 38, 38, 8, C.ink)
    rect(img, 22, 21, 20, 14, C.dark)
    outline(img, 22, 21, 20, 14, C.slate)
    sparkle(img, 32 + f, 28, C.cyan2)
  elseif has(name, "alert-bell") then
    rect(img, 29, 14, 6, 34, C.woodDark)
    circle(img, 32, 25, 13, C.amber)
    rect(img, 20, 25, 24, 9, C.brass)
    line(img, 17, 14 + f, 9, 8 + f, C.red)
    line(img, 47, 14 + f, 55, 8 + f, C.red)
  else
    rect(img, 12, 22, 40, 22, C.woodDark)
    outline(img, 12, 22, 40, 22, C.ink)
    arrow(img, 32, 33, C.cyan2, "right")
    rect(img, 27, 44, 10, 9, C.wood)
  end
end

local renderCrowd

local function renderInteraction(name, img, f, total)
  if has(name, "slot-hover") then
    rect(img, 18, 18, 28, 28, Color { r = C.cyan.red, g = C.cyan.green, b = C.cyan.blue, a = 30 })
    outline(img, 14, 14, 36, 36, C.ui2)
    cornerBrackets(img, 13, 13, 38, 38, C.cyan, f % 2)
    for x = 18, 46, 14 do
      for y = 18, 46, 14 do sparkle(img, x, y, C.cyan2) end
    end
    diamond(img, 32, 32, 4, C.white)
  elseif has(name, "slot-selected") then
    rect(img, 17, 17, 30, 30, Color { r = C.green.red, g = C.green.green, b = C.green.blue, a = 35 })
    outline(img, 10, 10, 44, 44, C.green)
    cornerBrackets(img, 12, 12, 40, 40, C.green2, f % 2)
    rect(img, 28, 28, 8, 8, C.green2)
    line(img, 22, 32, 42, 32, C.white)
    line(img, 32, 22, 32, 42, C.white)
  elseif has(name, "building-selected") then
    renderBuilding("building-api-gate-flowing", img, f, total)
    cornerBrackets(img, 8, 14, 48, 40, C.green2, f % 2)
    circle(img, 32, 54, 3 + f % 2, C.green)
  elseif has(name, "building-disabled") then
    renderBuilding("building-api-gate-dropping", img, f, total)
    rect(img, 9, 12, 46, 44, Color { r = C.red.red, g = C.red.green, b = C.red.blue, a = 35 })
    line(img, 12, 14, 52, 54, C.red)
    line(img, 52, 14, 12, 54, C.red2)
    cornerBrackets(img, 9, 14, 46, 40, C.red, 0)
  elseif has(name, "target-preview") then
    circle(img, 32, 32, 22, Color { r = C.cyan.red, g = C.cyan.green, b = C.cyan.blue, a = 45 })
    cornerBrackets(img, 16, 16, 32, 32, C.cyan2, f % 2)
    line(img, 12, 32, 25, 32, C.cyan2)
    line(img, 39, 32, 52, 32, C.cyan2)
    line(img, 32, 12, 32, 25, C.cyan2)
    line(img, 32, 39, 32, 52, C.cyan2)
    diamond(img, 32 + f, 32, 5, C.white)
    circle(img, 32, 32, 3, C.dark)
  elseif has(name, "range-preview") then
    for i = 0, 15 do
      local a = (i / 16) * 6.283
      if i % 2 == f % 2 then circle(img, 32 + math.cos(a) * 24, 32 + math.sin(a) * 18, 2, C.amber) end
    end
    rect(img, 26, 27, 12, 10, C.dark)
    outline(img, 26, 27, 12, 10, C.green2)
    diamond(img, 32, 25, 5, C.green2)
    line(img, 32, 37, 32, 45, C.green)
  elseif has(name, "feedback-affordable") then
    renderUi("ui-button-build-queue", img, f, total)
    rect(img, 17, 39, 31, 8, C.dark)
    outline(img, 17, 39, 31, 8, C.green2)
    line(img, 21, 42, 29, 48, C.green2)
    line(img, 29, 48, 47, 25, C.green2)
  elseif has(name, "feedback-unaffordable") then
    renderUi("ui-button-build-queue", img, f, total)
    rect(img, 16, 15, 32, 10, C.red)
    outline(img, 16, 15, 32, 10, C.ink)
    line(img, 21, 20, 43, 20, C.white)
    line(img, 25, 16, 39, 25, C.red2)
  elseif has(name, "feedback-new-unlock") then
    renderUi("ui-panel-recap", img, f, total)
    softCircle(img, 32, 31, 17 + f % 2, C.amber, 60)
    diamond(img, 32, 30, 12 + f % 2, C.amber)
    outline(img, 20, 18, 24, 24, C.brass)
    sparkle(img, 20, 20 + f, C.white)
    sparkle(img, 45, 41 - f, C.green2)
  elseif has(name, "feedback-upgrade-applied") then
    renderBadge("badge-capacity", img, f, total)
    arrow(img, 46, 20 + f, C.green2, "right")
    sparkle(img, 18, 43 - f, C.brass)
  elseif has(name, "feedback-invalid-action") then
    rect(img, 13, 17, 38, 31, Color { r = C.red.red, g = C.red.green, b = C.red.blue, a = 30 })
    outline(img, 10 + f % 2, 14, 44, 36, C.red)
    cornerBrackets(img, 11, 15, 42, 34, C.red2, 0)
    line(img, 20, 22, 44, 46, C.red2)
    line(img, 44, 22, 20, 46, C.red2)
  elseif name:find("combo") then
    for i = 0, 2 do
      envelope(img, 18 + i * 14, 32 + ((i + f) % 2), 6, i == 1 and C.green or C.cyan, C.white)
      if i < 2 then arrow(img, 25 + i * 14, 32, C.brass, "right") end
    end
    line(img, 16, 48, 26, 55, C.green2)
    line(img, 26, 55, 49, 18, C.green2)
    sparkle(img, 15 + f * 5, 17, C.brass)
  elseif has(name, "perfect-wave") then
    softCircle(img, 32, 31, 20 + f, C.brass, 70)
    rect(img, 22, 20, 20, 19, C.brass)
    outline(img, 22, 20, 20, 19, C.ink)
    rect(img, 25, 39, 14, 7, C.woodDark)
    rect(img, 20, 46, 24, 5, C.dark)
    line(img, 24, 30, 30, 36, C.white)
    line(img, 30, 36, 42, 23, C.white)
    sparkle(img, 14 + f * 3, 17, C.cyan2)
    sparkle(img, 51 - f * 2, 44, C.green2)
  elseif has(name, "near-miss") then
    softCircle(img, 32, 32, 22 - f, C.amber, 80)
    hourglass(img, 24, 16, C.amber)
    rect(img, 29, 47, 6, 6, C.red)
    envelope(img, 48 - f, 39, 5, C.cyan, C.white)
    line(img, 13, 52 - f, 51, 52 - f, C.red2)
    line(img, 15, 18, 49, 49, C.red)
  elseif has(name, "system-recovered") then
    rect(img, 12, 32, 40, 14, C.dark)
    outline(img, 12, 32, 40, 14, C.green2)
    line(img, 18, 27, 31, 40, C.amber)
    line(img, 22, 23, 35, 36, C.amber)
    sparkle(img, 45 - f, 18 + f, C.cyan2)
    line(img, 18, 40, 29, 50, C.green2)
    line(img, 29, 50, 50, 19, C.green2)
  elseif has(name, "crowd-trust-cheer") then
    renderCrowd("crowd-festival-cheer", img, f, total)
    rect(img, 16, 9 + f % 2, 32, 8, C.brass)
    outline(img, 16, 9 + f % 2, 32, 8, C.ink)
    circle(img, 26, 10 + f % 2, 3, C.red)
    circle(img, 38, 10 + f % 2, 3, C.red)
    sparkle(img, 32, 20 + f, C.white)
  elseif has(name, "critical-trust-warning") then
    softCircle(img, 32, 32, 19 + f % 2, C.red, 80)
    circle(img, 25, 27, 8, C.red)
    circle(img, 39, 27, 8, C.red)
    line(img, 17, 34, 32, 50, C.red2)
    line(img, 47, 34, 32, 50, C.red2)
    line(img, 31, 18, 36, 32, C.white)
    line(img, 36, 32, 29, 48, C.white)
    outline(img, 7 + f % 2, 7 + f % 2, 50, 50, C.red)
    line(img, 12, 52, 52, 12, C.red2)
  elseif has(name, "system-heartbeat") then
    rect(img, 7, 24, 50, 22, C.dark)
    outline(img, 7, 24, 50, 22, C.green)
    line(img, 10, 37, 20, 37, C.green)
    line(img, 20, 37, 26, 24 - f % 2, C.green2)
    line(img, 26, 24 - f % 2, 34, 48, C.green)
    line(img, 34, 48, 42, 31, C.green2)
    line(img, 42, 31, 54, 31, C.green)
    circle(img, 32, 32, 5 + f % 2, Color { r = C.green.red, g = C.green.green, b = C.green.blue, a = 70 })
  elseif has(name, "cursor-select") then
    line(img, 16, 11, 16, 49, C.ink)
    line(img, 17, 12, 43, 36, C.ink)
    line(img, 17, 12, 17, 47, C.white)
    line(img, 17, 12, 42, 35, C.white)
    line(img, 24, 36, 31, 50, C.cyan)
    line(img, 31, 50, 35, 47, C.ink)
    sparkle(img, 45, 20 + f, C.cyan2)
  elseif has(name, "cursor-place") then
    cornerBrackets(img, 16, 16, 32, 32, C.green, f)
    rect(img, 25, 29, 14, 9, C.dark)
    outline(img, 25, 29, 14, 9, C.green2)
    diamond(img, 32, 25, 5, C.green2)
    arrow(img, 43, 42, C.white, "down")
  elseif name:find("tooltip") then
    rect(img, 7, 11, 50, 39, C.ui)
    outline(img, 7, 11, 50, 39, C.ink)
    rect(img, 10, 14, 44, 5, C.cyan)
    uiGlyphPlate(img, 11, 23, 14, 14, C.cyan2)
    circle(img, 18, 30, 4, C.cyan)
    rect(img, 29, 24, 20, 3, C.pale)
    rect(img, 29, 31, 16 + f * 2, 3, C.amber)
    rect(img, 29, 38, 12, 3, C.green2)
    triangle(img, 20, 50, 28, 50, 24, 56, C.ui)
  elseif name:find("minimap") then
    rect(img, 11, 13, 42, 38, C.dark)
    outline(img, 11, 13, 42, 38, C.ui2)
    rect(img, 15, 17, 34, 30, C.slate)
    line(img, 16, 40, 49, 29, C.dirt)
    line(img, 20, 19, 20, 45, C.ui2)
    line(img, 32, 17, 32, 47, C.ui2)
    line(img, 44, 19, 44, 45, C.ui2)
    circle(img, 21 + f * 5, 36, 3, C.cyan)
    circle(img, 42, 28, 3, C.green)
    diamond(img, 31, 39, 3, C.amber)
  elseif has(name, "command-ping") then
    circle(img, 32, 32, 8 + f * 5, Color { r = C.cyan.red, g = C.cyan.green, b = C.cyan.blue, a = 70 })
    outline(img, 18 - f, 18 - f, 28 + f * 2, 28 + f * 2, C.cyan2)
  elseif has(name, "selection-ring") then
    for i = 0, 3 do
      local a = (i / 4) * 6.283 + f * 0.2
      circle(img, 32 + math.cos(a) * 19, 32 + math.sin(a) * 13, 3, C.green2)
    end
    outline(img, 11, 18, 42, 28, C.green)
  elseif has(name, "camera-alert") then
    outline(img, 4 + f, 4 + f, 56 - f * 2, 56 - f * 2, C.red)
    line(img, 12, 12, 52, 52, C.red2)
    line(img, 52, 12, 12, 52, C.red2)
  else
    circle(img, 32, 32, 10 + f * 3, C.green)
    line(img, 22, 32, 42, 32, C.cyan2)
    line(img, 32, 22, 32, 42, C.amber)
  end
end

local function renderScene(name, img, f, total)
  if has(name, "canal") then
    baseTile(img, C.grass, C.moss)
    rect(img, 0, 34, canvas, 18, C.blue)
    rect(img, 0, 27, canvas, 5, C.woodDark)
    rect(img, 0, 52, canvas, 4, C.woodDark)
    for x = -10, canvas, 15 do line(img, x + f * 3, 40, x + 10 + f * 3, 40, C.cyan2) end
    for x = 4, 58, 14 do
      rect(img, x, 28, 4, 4, C.moss)
      rect(img, x + 2, 54, 5, 2, C.moss)
    end
    envelope(img, 19 + f * 4, 37, 4, C.cyan, C.white)
    diamond(img, 44, 47 - f % 2, 3, C.green2)
  elseif has(name, "market") then
    baseTile(img, C.plaza, C.stone)
    renderProp("prop-festival-stall", img, f, total)
    rect(img, 4, 8, 12, 12, C.green)
    outline(img, 4, 8, 12, 12, C.ink)
    circle(img, 48, 15, 5, C.roofHi)
    line(img, 9, 26, 21, 22, C.brass)
    line(img, 45, 24, 55, 19, C.cyan2)
    for i = 0, 2 do
      circle(img, 15 + i * 16, 46 - (i + f) % 2, 3, C.brass)
      rect(img, 12 + i * 16, 50 - (i + f) % 2, 6, 5, i == 1 and C.cyan or C.green)
    end
  elseif has(name, "rooftop") then
    rect(img, 0, 0, canvas, canvas, C.dark)
    rect(img, 4, 10, 56, 38, C.slate)
    outline(img, 4, 10, 56, 38, C.ink)
    for x = 8, 56, 12 do rect(img, x, 14 + f % 2, 7, 25, C.roof) end
    line(img, 7, 42, 57, 26, C.cyan)
    circle(img, 16, 39, 3 + f % 2, C.cyan2)
    circle(img, 49, 29, 2 + (f + 1) % 2, C.amber)
    sparkle(img, 50, 9 + f, C.cyan2)
  elseif has(name, "stage") then
    baseTile(img, C.grass, C.moss)
    rect(img, 8, 28, 48, 20, C.wood)
    outline(img, 8, 28, 48, 20, C.ink)
    rect(img, 12, 16, 40, 12, C.roof)
    line(img, 17, 16, 26, 7 + f % 2, C.brass)
    line(img, 47, 16, 38, 7 + (f + 1) % 2, C.brass)
    rect(img, 14, 31, 8, 9, C.dark)
    rect(img, 42, 31, 8, 9, C.dark)
    for x = 19, 45, 13 do
      line(img, x, 48, x - 5 + f % 2, 55, C.amber)
    end
    sparkle(img, 32, 24, C.amber)
  elseif has(name, "message-fountain") then
    baseTile(img, C.plaza, C.stone)
    circle(img, 32, 35, 18, C.slate)
    circle(img, 32, 35, 13, C.blue)
    circle(img, 32, 35, 7, C.cyan)
    for i = 0, 5 do
      local a = (i / 6) * 6.283 + f * 0.25
      diamond(img, 32 + math.cos(a) * 17, 35 + math.sin(a) * 10, 3, i % 2 == 0 and C.cyan2 or C.green2)
    end
    line(img, 32, 13, 32, 33, C.cyan2)
    sparkle(img, 32, 12 + f, C.white)
  elseif has(name, "skyline") then
    rect(img, 0, 0, canvas, canvas, C.grass)
    rect(img, 0, 0, canvas, 18, C.blue)
    for x = 5, 55, 12 do
      rect(img, x, 22 - (x % 3) * 2, 8, 28, C.slate)
      rect(img, x, 17 - (x % 3) * 2, 8, 5, C.roof)
      rect(img, x + 2, 29, 2, 3, x % 2 == 0 and C.cyan2 or C.amber)
      rect(img, x + 5, 37, 2, 3, C.green2)
    end
    line(img, 4, 19, 28, 10 + f % 2, C.brass)
    line(img, 36, 11, 60, 19 + f % 2, C.brass)
    line(img, 0, 50, canvas, 50, C.moss)
  else
    baseTile(img, C.plaza, C.stone)
    renderProp("prop-data-lantern", img, f, total)
  end
end

function renderCrowd(name, img, f, total)
  local alarm = has(name, "alarm")
  local evacuate = has(name, "evacuate")
  local cheer = has(name, "cheer")
  local queueLine = has(name, "queue-line")
  local maintenance = has(name, "maintenance")
  baseTile(img, (alarm or queueLine) and C.plaza or C.grass, (alarm or queueLine) and C.stone or C.moss)
  rect(img, 0, 49, canvas, 4, evacuate and C.red or cheer and C.amber or maintenance and C.green or queueLine and C.amber or C.woodDark)
  line(img, 4, 50, 60, 50, cheer and C.green2 or alarm and C.red2 or maintenance and C.green2 or C.cyan)

  if cheer then
    line(img, 8, 12, 56, 14 + f % 2, C.brass)
    for x = 11, 51, 10 do
      rect(img, x, 14 + (x + f) % 2, 7, 7, x % 2 == 0 and C.roofHi or C.amber)
    end
    rect(img, 20, 6 + f % 2, 24, 6, C.green)
    outline(img, 20, 6 + f % 2, 24, 6, C.ink)
  elseif alarm then
    renderProp("prop-alert-bell", img, f, total)
    rect(img, 0, 0, canvas, canvas, Color { r = C.red.red, g = C.red.green, b = C.red.blue, a = 30 })
    line(img, 5, 54, 58, 43, C.red2)
  elseif evacuate then
    arrow(img, 47 + f % 2, 12, C.red2, "right")
    line(img, 7, 12, 50, 12, C.red)
    line(img, 45, 7, 58, 12, C.red)
    line(img, 45, 17, 58, 12, C.red)
  elseif queueLine then
    rect(img, 5, 13, 54, 9, C.wood)
    outline(img, 5, 13, 54, 9, C.ink)
    rect(img, 9, 16, 38 + f * 2, 3, C.amber)
    rect(img, 48, 30, 10, 17, C.dark)
    outline(img, 48, 30, 10, 17, C.amber)
    for i = 0, 4 do
      envelope(img, 11 + i * 8, 38 - (i + f) % 2, 4, i % 2 == 0 and C.cyan or C.amber, C.white)
    end
  elseif maintenance then
    renderProp("setpiece-rooftop-relay", img, f, total)
    rect(img, 5, 44, 54, 5, C.dark)
    line(img, 13, 39, 29, 28, C.green2)
    line(img, 37, 38, 49, 27, C.amber)
    sparkle(img, 31 + f, 28, C.white)
  else
    renderProp("prop-data-lantern", img, f, total)
    rect(img, 4, 12, 13, 10, C.wood)
    outline(img, 4, 12, 13, 10, C.ink)
    rect(img, 47, 14, 11, 9, C.roofHi)
    outline(img, 47, 14, 11, 9, C.ink)
  end

  for i = 0, 8 do
    local row = math.floor(i / 3)
    local drift = evacuate and (f * 2 + row) or 0
    local x = 12 + (i % 3) * 18 + drift
    local y = 23 + row * 10 + ((f + i) % 2)
    local tunic = i % 3 == 0 and C.cyan or i % 3 == 1 and C.roofHi or C.green
    if alarm then tunic = i % 2 == 0 and C.slate or C.red end
    if evacuate then tunic = i % 2 == 0 and C.amber or C.roofHi end
    if queueLine then x = 9 + i * 6 - math.min(f, i % 3); y = 25 + (i % 2) * 10; tunic = i % 2 == 0 and C.amber or C.cyan end
    if maintenance then x = 13 + (i % 3) * 18; y = 28 + row * 9 + ((f + i) % 2); tunic = i % 2 == 0 and C.green or C.slate end
    circle(img, x, y, 4, C.brass)
    rect(img, x - 4, y + 5, 8, 9, tunic)
    outline(img, x - 4, y + 5, 8, 9, C.ink)
    if cheer then
      line(img, x - 4, y + 6, x - 9, y - 2 - f % 2, C.amber)
      line(img, x + 4, y + 6, x + 9, y - 2 - f % 2, C.green2)
      if i % 2 == 0 then sparkle(img, x + 3, y - 11, C.white) end
    elseif alarm then
      sparkle(img, x, y - 8, C.red)
      line(img, x - 5, y + 14, x + 3, y + 18, C.red2)
    elseif evacuate then
      line(img, x - 5, y + 13, x - 10, y + 16, C.red2)
      line(img, x + 5, y + 13, x + 12, y + 15, C.red2)
    elseif queueLine then
      line(img, x - 5, y + 8, x - 9, y + 8 + f % 2, C.amber)
      if i == 8 then arrow(img, x + 7, y + 8, C.cyan2, "right") end
    elseif maintenance then
      line(img, x - 5, y + 8, x - 11, y + 4, C.green2)
      line(img, x + 5, y + 8, x + 10, y + 3, C.amber)
      if i % 3 == 1 then sparkle(img, x + 8, y - 3, C.white) end
    else
      line(img, x - 5, y + 8, x - 9 + f % 2, y + 11, C.cyan2)
      if i == 4 then envelope(img, x + 9, y + 5, 4, C.cyan, C.white) end
    end
    rect(img, x - 2, y + 14, 2, 5, C.dark)
    rect(img, x + 2, y + 14, 2, 5, C.dark)
  end
end

local function renderAmbience(name, img, f, total)
  if has(name, "fireflies") then
    baseTile(img, C.grass, C.moss)
    rect(img, 8, 47, 48, 6, C.woodDark)
    outline(img, 8, 47, 48, 6, C.ink)
    line(img, 3, 52, 59, 41, C.green)
    line(img, 0, 45, 64, 35, C.moss)
    for i = 0, 10 do
      local x = 6 + i * 5
      local y = 13 + ((i * 7 + f * 5) % 34)
      local color = i % 3 == 0 and C.cyan2 or i % 3 == 1 and C.green2 or C.amber
      sparkle(img, x, y, color)
      if i % 2 == 0 then px(img, x + 2, y + 1, color) end
    end
    envelope(img, 18 + f * 4, 42 - f % 2, 4, C.cyan, C.white)
    diamond(img, 45, 39 + f % 2, 3, C.green2)
  elseif has(name, "parallax-clouds") then
    rect(img, 0, 0, canvas, canvas, C.blue)
    rect(img, 0, 43, canvas, 21, C.green)
    for x = -18, 72, 24 do
      softCircle(img, x + f * 2, 15 + (x % 3), 9, C.pale, 95)
      softCircle(img, x + 8 + f * 2, 18, 7, C.pale, 90)
      rect(img, x - 3 + f * 2, 20, 24, 3, C.pale)
    end
    for x = 5, 55, 13 do
      rect(img, x, 35 - (x % 3), 7, 17, C.slate)
      rect(img, x + 2, 42, 2, 3, x % 2 == 0 and C.cyan2 or C.amber)
    end
    line(img, 0, 51, 64, 51, C.moss)
  elseif has(name, "courier-kites") then
    rect(img, 0, 0, canvas, canvas, C.blue)
    rect(img, 0, 45, canvas, 19, C.grass)
    for i = 0, 4 do
      local x = 8 + i * 13 + f * 2
      local y = 15 + (i % 2) * 8 - f % 2
      diamond(img, x % 68 - 2, y, 5, i % 2 == 0 and C.cyan or C.amber)
      line(img, x % 68 - 2, y + 5, 20 + i * 7, 45, C.pale)
      envelope(img, (x + 7) % 68, y + 11, 3, C.cyan, C.white)
    end
    renderProp("prop-signal-post", img, f, total)
  elseif has(name, "data-rain") then
    rect(img, 0, 0, canvas, canvas, C.dark)
    rect(img, 0, 42, canvas, 22, C.slate)
    for i = 0, 18 do
      local x = (i * 7 + f * 3) % 70 - 4
      local y = (i * 11 + f * 5) % 64
      line(img, x, y, x + 3, y + 7, i % 3 == 0 and C.cyan2 or i % 3 == 1 and C.green2 or C.amber)
    end
    rect(img, 12, 29, 40, 14, C.ui)
    outline(img, 12, 29, 40, 14, C.ink)
    line(img, 17, 37, 48, 33, C.cyan)
    sparkle(img, 43 - f, 24 + f, C.white)
  elseif has(name, "lantern-string") then
    baseTile(img, C.plaza, C.stone)
    rect(img, 5, 45, 54, 7, C.wood)
    outline(img, 5, 45, 54, 7, C.ink)
    line(img, 5, 17, 58, 13 + f % 2, C.brass)
    for x = 9, 55, 9 do
      line(img, x, 16, x, 25, C.woodDark)
      rect(img, x - 3, 25, 7, 9, x % 2 == 0 and C.amber or C.cyan)
      outline(img, x - 3, 25, 7, 9, C.ink)
      circle(img, x, 35, 5 + (x + f) % 2, x % 2 == 0 and C.amber or C.cyan)
    end
    for x = 12, 50, 19 do
      circle(img, x, 43, 3, C.brass)
      rect(img, x - 3, 46, 6, 5, x % 2 == 0 and C.green or C.roofHi)
    end
  elseif has(name, "smoke") then
    baseTile(img, C.plaza, C.stone)
    rect(img, 19, 41, 26, 11, C.slate)
    outline(img, 19, 41, 26, 11, C.ink)
    rect(img, 24, 34, 16, 9, C.woodDark)
    outline(img, 24, 34, 16, 9, C.ink)
    rect(img, 29, 28, 7, 9, C.dark)
    for i = 0, 4 do
      circle(img, 24 + i * 6 + f % 2, 29 - i * 5 - f, 3 + i, Color { r = C.pale.red, g = C.pale.green, b = C.pale.blue, a = 90 })
    end
    line(img, 8, 18 + f, 19, 15, C.cyan2)
    line(img, 45, 12, 56, 18 + f, C.green2)
    arrow(img, 49, 15 + f % 2, C.cyan2, "right")
    diamond(img, 14, 18, 3, C.green2)
  elseif has(name, "banners") then
    baseTile(img, C.grass, C.moss)
    rect(img, 0, 48, canvas, 4, C.dirt)
    rect(img, 10, 12, 4, 42, C.woodDark)
    rect(img, 50, 12, 4, 42, C.woodDark)
    line(img, 12, 16, 52, 16 + f % 2, C.brass)
    for x = 15, 46, 10 do
      rect(img, x, 17 + (x + f) % 2, 7, 11, x % 2 == 0 and C.roofHi or C.amber)
      rect(img, x, 28 + (x + f) % 2, 7, 3, C.dark)
    end
    circle(img, 19, 47, 3, C.brass)
    circle(img, 43, 48, 3, C.brass)
  else
    baseTile(img, C.plaza, C.stone)
    rect(img, 8, 48, 48, 4, C.dark)
    outline(img, 8, 48, 48, 4, C.ink)
    for i = 0, 5 do
      local x = 12 + i * 8
      diamond(img, x, 34 + math.sin(f + i) * 3, 4, i % 2 == 0 and C.magenta or C.cyan)
      line(img, x, 34, 32, 32, C.green)
    end
    circle(img, 32, 32, 5 + f % 2, C.green2)
    line(img, 16, 20, 48, 44, C.cyan)
    line(img, 48, 20, 16, 44, C.amber)
    sparkle(img, 18 + f * 4, 17 + f % 2, C.white)
  end
end

local function renderTransition(name, img, f, total)
  if has(name, "build-phase") then
    renderUi("ui-button-build-queue", img, f, total)
    outline(img, 6 + f, 10 + f, 52 - f * 2, 44 - f * 2, C.green)
  elseif name:find("countdown") then
    rect(img, 10, 16, 44, 32, C.dark)
    outline(img, 10, 16, 44, 32, C.amber)
    rect(img, 20, 28, 24, 8, C.amber)
    rect(img, 24 + f * 3, 24, 5, 16, C.white)
  elseif name:find("incident") then
    renderEffect("effect-noise-glitch", img, f, total)
    outline(img, 8, 8, 48, 48, C.magenta)
  elseif name:find("boss") then
    rect(img, 6, 18, 52, 28, C.red)
    outline(img, 6, 18, 52, 28, C.ink)
    diamond(img, 32, 32, 15 + f % 2, C.green)
    line(img, 15, 32, 49, 32, C.white)
  else
    renderUi("ui-panel-recap", img, f, total)
    line(img, 20, 34, 29, 43, C.green2)
    line(img, 29, 43, 47, 21, C.green2)
  end
end

local assets = {
  { "map-ground-grass", 2, renderMap },
  { "map-ground-plaza", 2, renderMap },
  { "map-lane-traffic", 3, renderMap },
  { "map-lane-job", 3, renderMap },
  { "map-lane-data", 3, renderMap },
  { "map-spawn-festival-gate", 4, renderMap },
  { "map-exit-storage-fixed", 4, renderMap },
  { "map-build-slot-ingress", 3, renderMap },
  { "map-build-slot-worker", 3, renderMap },
  { "map-build-slot-queue", 3, renderMap },
  { "map-placement-preview-valid", 3, renderMap },
  { "map-placement-preview-invalid", 3, renderMap },

  { "building-api-gate-flowing", 4, renderBuilding },
  { "building-api-gate-saturated", 4, renderBuilding },
  { "building-api-gate-dropping", 4, renderBuilding },
  { "building-worker-yard-idle", 3, renderBuilding },
  { "building-worker-yard-working", 4, renderBuilding },
  { "building-worker-yard-saturated", 4, renderBuilding },
  { "building-queue-hub-empty", 3, renderBuilding },
  { "building-queue-hub-filling", 4, renderBuilding },
  { "building-queue-hub-backing-up", 4, renderBuilding },
  { "building-queue-hub-overflowing", 4, renderBuilding },

  { "packet-useful", 4, renderPacket },
  { "packet-useful-queued", 3, renderPacket },
  { "packet-useful-processing", 4, renderPacket },
  { "packet-flood", 4, renderPacket },
  { "packet-expiring", 3, renderPacket },

  { "effect-message-spawn", 4, renderEffect },
  { "effect-message-accepted", 4, renderEffect },
  { "effect-message-queued", 4, renderEffect },
  { "effect-worker-start", 4, renderEffect },
  { "effect-ack-delivered", 6, renderEffect },
  { "effect-drop", 6, renderEffect },
  { "effect-timeout-expired", 6, renderEffect },
  { "effect-overflow", 6, renderEffect },
  { "effect-backlog-saturation", 4, renderEffect },
  { "effect-trust-loss", 4, renderEffect },
  { "effect-budget-gain", 4, renderEffect },
  { "effect-wave-start", 6, renderEffect },
  { "effect-wave-end", 6, renderEffect },

  { "badge-api", 2, renderBadge },
  { "badge-queue", 3, renderBadge },
  { "badge-worker", 3, renderBadge },
  { "badge-storage-exit", 3, renderBadge },

  { "ui-frame-hud", 2, renderUi },
  { "ui-icon-trust", 3, renderUi },
  { "ui-icon-budget", 3, renderUi },
  { "ui-icon-backlog", 3, renderUi },
  { "ui-meter-trust", 3, renderUi },
  { "ui-meter-budget", 3, renderUi },
  { "ui-meter-backlog", 3, renderUi },
  { "ui-button-start-wave", 3, renderUi },
  { "ui-button-build-queue", 3, renderUi },
  { "ui-control-worker-count", 3, renderUi },
  { "ui-recap-delivered", 3, renderUi },
  { "ui-recap-dropped", 3, renderUi },
  { "ui-recap-backlog-peak", 3, renderUi },

  { "building-validation-gate-passing", 4, renderBuilding },
  { "building-validation-gate-rejecting", 4, renderBuilding },
  { "building-validation-gate-quarantining", 4, renderBuilding },
  { "building-validation-gate-too-strict", 4, renderBuilding },
  { "building-db-vault-writing", 4, renderBuilding },
  { "building-db-vault-slow", 4, renderBuilding },
  { "building-db-vault-locked", 4, renderBuilding },
  { "building-db-vault-inconsistent", 4, renderBuilding },

  { "badge-validation", 3, renderBadge },
  { "badge-storage", 3, renderBadge },
  { "badge-throttle", 3, renderBadge },
  { "badge-capacity", 3, renderBadge },
  { "badge-backpressure", 3, renderBadge },
  { "badge-retry-limit", 3, renderBadge },
  { "badge-timeout", 3, renderBadge },
  { "badge-recovery", 3, renderBadge },
  { "badge-strictness", 3, renderBadge },
  { "badge-quarantine", 3, renderBadge },
  { "badge-write-capacity", 3, renderBadge },
  { "badge-constraint-safety", 3, renderBadge },
  { "badge-transaction-safety", 3, renderBadge },

  { "packet-noise", 4, renderPacket },
  { "packet-noise-rejected", 4, renderPacket },
  { "packet-noise-quarantined", 4, renderPacket },
  { "packet-replay-phantom", 4, renderPacket },
  { "packet-replay-duplicate", 4, renderPacket },
  { "packet-poison-boss", 6, renderPacket },
  { "packet-poison-pinned", 6, renderPacket },
  { "packet-poison-quarantined", 6, renderPacket },

  { "effect-noise-glitch", 6, renderEffect },
  { "effect-validation-reject", 6, renderEffect },
  { "effect-validation-quarantine", 6, renderEffect },
  { "effect-too-strict-false-reject", 6, renderEffect },
  { "effect-replay-duplicate", 6, renderEffect },
  { "effect-idempotency-safe", 6, renderEffect },
  { "effect-poison-pin", 6, renderEffect },
  { "effect-retry-loop", 6, renderEffect },
  { "effect-quarantine-success", 6, renderEffect },
  { "effect-db-write", 5, renderEffect },
  { "effect-db-slow", 5, renderEffect },
  { "effect-db-locked", 5, renderEffect },
  { "effect-db-inconsistent", 6, renderEffect },

  { "ui-icon-compute", 3, renderUi },
  { "ui-meter-compute", 3, renderUi },
  { "ui-icon-throughput", 3, renderUi },
  { "ui-icon-uptime", 3, renderUi },
  { "ui-icon-complexity", 3, renderUi },
  { "ui-button-upgrade", 3, renderUi },
  { "ui-button-inspect", 3, renderUi },
  { "ui-button-pause", 2, renderUi },
  { "ui-button-speed", 3, renderUi },
  { "ui-panel-recap", 2, renderUi },
  { "ui-panel-inspector", 2, renderUi },

  { "building-observability-tower", 4, renderBuilding },
  { "building-idempotency-ledger", 4, renderBuilding },
  { "building-dlq-station", 4, renderBuilding },
  { "building-cache-kiosk", 4, renderBuilding },
  { "building-auth-tower", 4, renderBuilding },
  { "building-rate-limit-wall", 4, renderBuilding },
  { "building-transaction-bridge", 4, renderBuilding },

  { "character-gate-operator", 4, renderCharacter },
  { "character-queue-keeper", 4, renderCharacter },
  { "character-worker-artificer", 4, renderCharacter },
  { "character-validation-scribe", 4, renderCharacter },
  { "character-db-warden", 4, renderCharacter },
  { "character-courier-runner", 4, renderCharacter },
  { "character-maintainer", 4, renderCharacter },
  { "character-gate-operator-portrait", 4, renderCharacterPortrait },
  { "character-queue-keeper-portrait", 4, renderCharacterPortrait },
  { "character-worker-artificer-portrait", 4, renderCharacterPortrait },
  { "character-validation-scribe-portrait", 4, renderCharacterPortrait },
  { "character-db-warden-portrait", 4, renderCharacterPortrait },
  { "character-courier-runner-portrait", 4, renderCharacterPortrait },
  { "character-maintainer-portrait", 4, renderCharacterPortrait },

  { "crowd-festival-idle", 4, renderCrowd },
  { "crowd-festival-cheer", 4, renderCrowd },
  { "crowd-festival-alarm", 4, renderCrowd },
  { "crowd-festival-evacuate", 4, renderCrowd },
  { "crowd-queue-line", 4, renderCrowd },
  { "crowd-maintenance-crew", 4, renderCrowd },

  { "ambient-data-fireflies", 4, renderAmbience },
  { "ambient-lantern-string", 4, renderAmbience },
  { "ambient-chimney-signal-smoke", 4, renderAmbience },
  { "ambient-market-banners", 4, renderAmbience },
  { "ambient-magic-circuit-sparks", 4, renderAmbience },
  { "ambient-parallax-clouds", 4, renderAmbience },
  { "ambient-courier-kites", 4, renderAmbience },
  { "ambient-data-rain", 4, renderAmbience },

  { "setpiece-festival-stage", 4, renderScene },
  { "setpiece-message-fountain", 4, renderScene },
  { "setpiece-clock-bell-tower", 4, renderProp },
  { "setpiece-guild-notice-board", 4, renderProp },
  { "setpiece-archive-cart", 4, renderProp },
  { "setpiece-debug-market-stall", 4, renderProp },
  { "setpiece-canal-bridge", 4, renderProp },
  { "setpiece-rooftop-relay", 4, renderProp },
  { "map-ambient-canal", 4, renderScene },
  { "map-market-corner", 4, renderScene },
  { "map-rooftop-shadow", 4, renderScene },
  { "map-festival-skyline", 4, renderScene },

  { "interaction-slot-hover", 4, renderInteraction },
  { "interaction-slot-selected", 4, renderInteraction },
  { "interaction-building-selected", 4, renderInteraction },
  { "interaction-building-disabled", 4, renderInteraction },
  { "interaction-target-preview", 4, renderInteraction },
  { "interaction-range-preview", 4, renderInteraction },
  { "ui-cursor-select", 4, renderInteraction },
  { "ui-cursor-place", 4, renderInteraction },
  { "ui-tooltip-panel", 4, renderInteraction },
  { "ui-minimap-pip", 4, renderInteraction },
  { "ui-feedback-affordable", 4, renderInteraction },
  { "ui-feedback-unaffordable", 4, renderInteraction },
  { "ui-feedback-new-unlock", 4, renderInteraction },
  { "ui-feedback-upgrade-applied", 4, renderInteraction },
  { "ui-feedback-invalid-action", 4, renderInteraction },

  { "transition-build-phase", 5, renderTransition },
  { "transition-wave-countdown", 5, renderTransition },
  { "transition-incident-arrival", 6, renderTransition },
  { "transition-boss-warning", 6, renderTransition },
  { "transition-recap-open", 5, renderTransition },
  { "effect-combo-delivery-chain", 6, renderInteraction },
  { "effect-perfect-wave", 6, renderInteraction },
  { "effect-near-miss-timeout", 6, renderInteraction },
  { "effect-system-recovered", 6, renderInteraction },
  { "effect-crowd-trust-cheer", 6, renderInteraction },
  { "effect-critical-trust-warning", 6, renderInteraction },
  { "effect-command-ping", 5, renderInteraction },
  { "effect-selection-ring", 5, renderInteraction },
  { "effect-camera-alert", 5, renderInteraction },
  { "effect-system-heartbeat", 5, renderInteraction }
}

for _, asset in ipairs(assets) do
  local name = asset[1]
  local frames = asset[2]
  local renderer = asset[3]
  addTag(name, frames, function(img, f, total)
    renderer(name, img, f, total)
  end)
end

if #sprite.frames >= frameIndex then
  sprite:deleteFrame(sprite.frames[frameIndex])
end

for _, item in ipairs(tagRanges) do
  local tag = sprite:newTag(item.from, item.to)
  tag.name = item.id
  tag.aniDir = AniDir.FORWARD
end

sprite.data = "Generated from tools/assets/aseprite/recipes/gameplay-atlas.lua"
sprite:saveAs(sourcePath)
writeManifest()
sprite:close()

print("Generated " .. sourcePath .. " and " .. manifestPath .. " with " .. tostring(#manifest) .. " tagged animations")
