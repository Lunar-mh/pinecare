'use strict';

const DEFAULT_DECADE = '1980s';

const game = (gameType, name, description, rules) => ({
  gameType,
  name,
  description,
  rules,
  difficulties: [1, 2, 3, 4, 5],
});

const songs = (...items) => items.map(([title, artist]) => ({ title, artist }));
const movies = (...items) => items.map(([title, year]) => ({ title, year }));
const photos = (...items) => items.map(([title, description]) => ({ title, description }));
const nostalgia = (songList, movieList, photoList) => ({ songs: songList, movies: movieList, photos: photoList });

const GAME_LIST = [
  game('memory', '数字记忆', '短时记忆训练，帮助保持注意力和记忆力。', '系统展示一组数字，短暂记忆后按顺序输入。'),
  game('word_chain', '词语接龙', '语言联想训练，帮助保持思维活跃。', '根据上一个词的末字接出下一个词。'),
  game('puzzle', '拼图', '空间认知训练，帮助保持专注和耐心。', '在限定时间内完成图块拼接。'),
];

const NOSTALGIA_LIBRARY = {
  '1950s': nostalgia(
    songs(['南泥湾', '郭兰英'], ['让我们荡起双桨', '刘惠芳'], ['我的祖国', '郭兰英']),
    movies(['白毛女', 1951], ['上甘岭', 1956], ['林家铺子', 1959]),
    photos(['老式收音机', '木质机身与旋钮调频，是很多家庭共同的时代记忆。'], ['胡同生活照', '邻里围坐聊天，充满烟火气。'])
  ),
  '1960s': nostalgia(
    songs(['草原上升起不落的太阳', '胡松华'], ['洪湖水浪打浪', '王玉珍'], ['学习雷锋好榜样', '合唱']),
    movies(['英雄儿女', 1964], ['地道战', 1965], ['小兵张嘎', 1963]),
    photos(['黑白全家福', '翻领衬衫和中山装是那个年代常见穿着。'], ['老式自行车', '二八大杠是很多人的通勤主力。'])
  ),
  '1970s': nostalgia(
    songs(['红星歌', '少年广播合唱团'], ['我爱你中国', '叶佩英'], ['边疆的泉水清又纯', '李谷一']),
    movies(['闪闪的红星', 1974], ['小花', 1979], ['庐山恋', 1980]),
    photos(['搪瓷缸', '常见的生活用品，承载了很多家庭回忆。'], ['工厂车间照', '记录了那个年代朴素而热烈的劳动场景。'])
  ),
  '1980s': nostalgia(
    songs(['年轻的朋友来相会', '李谷一'], ['外婆的澎湖湾', '潘安邦'], ['甜蜜蜜', '邓丽君']),
    movies(['牧马人', 1982], ['少林寺', 1982], ['高山下的花环', 1984]),
    photos(['大头电视机', '一家人围坐看电视是很多人的共同记忆。'], ['老式录音机', '磁带时代的音乐回忆。'])
  ),
  '1990s': nostalgia(
    songs(['涛声依旧', '毛宁'], ['同桌的你', '老狼'], ['千千阙歌', '陈慧娴']),
    movies(['霸王别姬', 1993], ['阳光灿烂的日子', 1994], ['一个都不能少', 1999]),
    photos(['录像厅海报墙', '周末观影娱乐的热门去处。'], ['街机厅', '游戏机和青春记忆交织在一起。'])
  ),
};

module.exports = {
  DEFAULT_DECADE,
  GAME_LIST,
  NOSTALGIA_LIBRARY,
};
