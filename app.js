/* ============================================================
   金融风控建模学习工作台  —  纯本地应用，无外部网络依赖
   数据全部保存在浏览器 localStorage，离线可用，关闭不丢
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 工具函数 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 1600);
  }

  /* 颜色工具：hex <-> rgb，混合、加深 */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const f = (x) => x.toString(16).padStart(2, '0');
    return '#' + f(Math.max(0, Math.min(255, r))) + f(Math.max(0, Math.min(255, g))) + f(Math.max(0, Math.min(255, b)));
  }
  function mix(hex, target, ratio) {
    const a = hexToRgb(hex), b = hexToRgb(target);
    return rgbToHex(
      Math.round(a.r + (b.r - a.r) * ratio),
      Math.round(a.g + (b.g - a.g) * ratio),
      Math.round(a.b + (b.b - a.b) * ratio)
    );
  }
  function darken(hex, ratio) { return mix(hex, '#000000', ratio); }
  function lighten(hex, ratio) { return mix(hex, '#ffffff', ratio); }

  /* ---------------- 主题预设 ---------------- */
  const THEMES = [
    { name: '奶油绿', primary: '#8fd3a8', bg: '#f0f7f0', title: '#2f6b5e' },
    { name: '薄荷蓝', primary: '#8ecae6', bg: '#eef6fb', title: '#1d5b7a' },
    { name: '樱花粉', primary: '#f4b8c4', bg: '#fdf0f3', title: '#9c4a5a' },
    { name: '暖阳橙', primary: '#f6b26b', bg: '#fdf3e7', title: '#a35e1f' },
    { name: '淡紫', primary: '#c3a8e1', bg: '#f4effb', title: '#5b3f86' },
    { name: '海盐灰蓝', primary: '#9bb3c9', bg: '#eef2f6', title: '#3d5468' },
    { name: '柠檬青', primary: '#cfe06a', bg: '#f6f8e8', title: '#5d6b1f' },
    { name: '豆沙红', primary: '#e0978f', bg: '#fbf1ef', title: '#8a3b32' },
    { name: '天青', primary: '#7fc8c0', bg: '#eef8f6', title: '#1f5d56' },
    { name: '燕麦', primary: '#d8c7a8', bg: '#f8f4ec', title: '#6b5a3a' },
    { name: '湖蓝', primary: '#6fb1d6', bg: '#eaf3fa', title: '#1f4d6b' },
    { name: '黛紫', primary: '#a89bd6', bg: '#f2eefb', title: '#463a78' }
  ];

  /* ---------------- 学习模块内容 ---------------- */
  const MODULES = [
    {
      id: 'py-base', title: 'Python数据分析通用基础',
      desc: '表格样本处理、缺失值 / 异常值清洗代码记录',
      sections: [
        {
          id: 'table', title: '表格样本处理', tag: '基础',
          note: '使用 pandas 完成数据读取、预览与基础筛选。风控中最常用 shape / head / info / describe 快速了解样本分布，再用条件过滤定位坏样本。',
          code:
`import pandas as pd
import numpy as np

df = pd.read_csv('loan.csv')
print(df.shape)        # (行数, 列数)
print(df.head(5))      # 前 5 行
print(df.info())       # 字段类型与缺失概览
print(df.describe())   # 数值字段统计

# 条件过滤：逾期超过 30 天的样本
bad = df[df['dpd'] > 30]

# 选择特征列
feats = df[['age', 'income', 'dpd']]

# 按年龄分组看平均逾期
print(df.groupby('age_bin')['dpd'].mean())`
        },
        {
          id: 'missing', title: '缺失值处理', tag: '清洗',
          note: '先统计缺失比例，再按字段类型选择填充策略：数值型用中位数（抗异常值），类别型用众数；缺失比例过高的列直接剔除，避免引入噪声。',
          code:
`# 缺失值概览
print(df.isnull().sum())

# 数值型：中位数填充（抗异常值）
df['income'] = df['income'].fillna(df['income'].median())

# 类别型：众数填充
df['edu'] = df['edu'].fillna(df['edu'].mode()[0])

# 缺失比例超过 50% 的列直接删除
df = df.dropna(axis=1, thresh=int(0.5 * len(df)))

# 也可统一用常量标记“是否缺失”
df['income_missing'] = df['income'].isnull().astype(int)`
        },
        {
          id: 'outlier', title: '异常值清洗', tag: '清洗',
          note: '异常值会扭曲模型。常用 IQR 法定位离群点，再用“盖帽法(winsorize)”把极端值截断到分位边界，而不是简单删除，保留样本量的同时抑制极值影响。',
          code:
`# 基于 IQR 识别异常值
q1 = df['income'].quantile(0.25)
q3 = df['income'].quantile(0.75)
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr

mask = (df['income'] >= low) & (df['income'] <= high)
df_clean = df[mask]           # 仅保留正常区间样本

# 盖帽法：把越界值截断到边界（保留样本）
df['income'] = df['income'].clip(low, high)

# 用 z-score 也可，但需先确认近似正态分布
from scipy import stats
z = np.abs(stats.zscore(df['income']))
df = df[z < 3]`
        }
      ]
    },
    {
      id: 'risk-concept', title: '风控业务基础概念',
      desc: '好坏样本、观察 / 表现窗口、逾期定义，及风控与量化差异',
      sections: [
        {
          id: 'goodbad', title: '好坏样本与逾期定义', tag: '概念',
          note: '坏样本(bad)通常定义为表现窗口内发生 M3+ 逾期（逾期 ≥ 90 天）或呆账；好样本为表现窗口内无逾期或仅 M1。处于中间的“灰样本”一般剔除，避免标签噪声。',
          code:
`# 逾期账期定义（M 代表 Month）
# M0 = 未逾期
# M1 = 逾期 1~30 天
# M2 = 逾期 31~60 天
# M3 = 逾期 61~90 天（多数机构以此为“坏”阈值）

def label_bad(dpd, threshold=90):
    """dpd: 最长逾期天数；返回 1=坏, 0=好"""
    return 1 if dpd >= threshold else 0

df['y'] = df['max_dpd'].apply(lambda x: label_bad(x, 90))`
        },
        {
          id: 'window', title: '观察窗口与表现窗口', tag: '概念',
          note: '观察窗口(Observation Window)用于提取客户申请时点的特征；表现窗口(Performance Window)用于观察其后续是否违约，通常 6~12 个月。两者必须不重叠，否则会造成数据泄露（标签信息混入特征）。',
          code:
`# 时间切分示例
# 观察窗口: 申请日 - 12个月  ~  申请日
# 表现窗口: 申请日 + 1个月  ~  申请日 + 1个月 + 12个月
obs_start   = '2019-01-01'; obs_end   = '2019-12-31'
perf_start  = '2020-01-01'; perf_end  = '2020-12-31'

features = extract_features(df, obs_start, obs_end)   # 仅用观察窗口内数据
label    = extract_label(df, perf_start, perf_end)    # 仅用表现窗口内违约
# 关键：两窗口无交集 -> 杜绝 leakage`
        },
        {
          id: 'vs-quant', title: '风控建模 VS 股票量化（任务差异）', tag: '对比',
          note: '两者都建模，但目标与数据性质不同。下方对比帮助建立清晰边界，避免把量化思路直接套用到信贷风控。',
          code:
`# 差异对比（结构化梳理）
diff = {
  '目标':       ['风控: 预测违约概率/排序', '量化: 预测收益/涨跌'],
  '标签':       ['风控: 逾期好坏(0/1)',      '量化: 未来收益率(连续)'],
  '评估指标':   ['风控: AUC / KS / Gini',    '量化: 夏普/回撤/胜率'],
  '数据性质':   ['风控: 横截面客户属性',      '量化: 时间序列行情'],
  '样本划分':   ['风控: 按时间避免泄露',      '量化: 严格时序滚动'],
  '可解释性':   ['风控: 监管强要求(评分卡)',  '量化: 更重收益'],
}`
        }
      ]
    },
    {
      id: 'feature', title: '风控数据清洗与特征工程',
      desc: '衍生特征构建、缺失值填充、WOE 分箱知识点与实操',
      sections: [
        {
          id: 'derive', title: '衍生特征构建', tag: '特征',
          note: '从原始字段构造对违约更有区分度的特征：负债收入比、额度使用率、近 N 月查询次数等，是风控特征工程的核心。',
          code:
`# 负债收入比 DTI
df['dti'] = df['total_debt'] / df['income'].replace(0, np.nan)

# 信用额度使用率
df['util_rate'] = df['used_limit'] / df['credit_limit'].replace(0, np.nan)

# 近 3 个月硬查询次数
df['inq_3m'] = df['inquiry_count'].apply(lambda x: x if x <= 3 else 3)

# 年龄分段（分箱预处理）
df['age_bin'] = pd.cut(df['age'], [0, 25, 35, 45, 55, 100],
                       labels=['<25','25-35','35-45','45-55','55+'])`
        },
        {
          id: 'woe', title: 'WOE 分箱与编码', tag: 'WOE',
          note: 'WOE(Weight of Evidence)把分箱后的类别映射为与好坏比相关的连续值，使逻辑回归可直接使用，并提升单调性。下面给出标准实现。',
          code:
`def calc_woe_iv(df, col, target='y', bins=5):
    """对数值列做等频分箱并计算 WOE 与 IV"""
    df = df.copy()
    df['bin'] = pd.qcut(df[col], bins, duplicates='drop')
    grp = df.groupby('bin', as_index=False).agg(
        tot=(target, 'count'),
        bad=(target, 'sum'))
    grp['good'] = grp['tot'] - grp['bad']
    # 加平滑避免除零
    grp['woe'] = np.log(
        ((grp['good'] + 0.5) / (grp['good'].sum() + 0.5)) /
        ((grp['bad'] + 0.5) / (grp['bad'].sum() + 0.5)))
    grp['iv'] = (grp['good'] / grp['good'].sum() -
                 grp['bad'] / grp['bad'].sum()) * grp['woe']
    iv = grp['iv'].sum()
    return grp[['bin', 'tot', 'bad', 'woe', 'iv']], iv

res, iv = calc_woe_iv(df, 'income', 'y', bins=5)
print('IV =', round(iv, 4))
print(res)`
        }
      ]
    },
    {
      id: 'iv-psi', title: 'IV、PSI、特征筛选专项',
      desc: '核心专项：完整可运行代码 + 特征漂移场景应对',
      sections: [
        {
          id: 'iv', title: 'IV 信息价值计算', tag: 'IV',
          note: 'IV 衡量单个特征对好坏的区分能力。经验阈值：<0.02 无预测力，0.02~0.1 弱，0.1~0.3 中等，0.3~0.5 强，>0.5 可疑（可能泄露）。',
          code:
`def information_value(df, feature, target='y'):
    lst = []
    for _, d in df.groupby(feature):
        good = d[d[target] == 0].shape[0]
        bad = d[d[target] == 1].shape[0]
        tot_good = df[df[target] == 0].shape[0]
        tot_bad = df[df[target] == 1].shape[0]
        good_dist = (good + 0.5) / (tot_good + 0.5)
        bad_dist = (bad + 0.5) / (tot_bad + 0.5)
        woe = np.log(good_dist / bad_dist)
        iv = (good_dist - bad_dist) * woe
        lst.append(iv)
    return sum(lst)

iv = information_value(df, 'age_bin', 'y')
print('IV(age_bin) =', round(iv, 4))`
        },
        {
          id: 'psi', title: 'PSI 群体稳定性指标', tag: 'PSI',
          note: 'PSI 监控特征分布是否随时间漂移。阈值：<0.1 稳定，0.1~0.25 需关注，>0.25 不稳定需处理。常用于训练集 vs 近期样本的分布对比。',
          code:
`def psi(expected, actual, bins=10):
    """expected: 训练集分箱边界; actual: 近期样本"""
    e_cut = pd.qcut(expected, bins, duplicates='drop')
    e_perc = expected.groupby(e_cut).size() / len(expected)
    a_cut = pd.cut(actual, e_cut.cat.categories)
    a_perc = actual.groupby(a_cut, observed=False).size() / len(actual)
    psi_val = 0
    for e, a in zip(e_perc, a_perc):
        e = max(e, 0.0001); a = max(a, 0.0001)
        psi_val += (a - e) * np.log(a / e)
    return psi_val

p = psi(train['income'], recent['income'])
print('PSI(income) =', round(p, 4), '稳定' if p < 0.1 else '需关注')`
        },
        {
          id: 'drift', title: '特征漂移场景与应对', tag: 'PSI',
          note: '常见漂移：客群结构变化、政策调整、数据口径变更。应对：建立 PSI 监控看板，对超阈特征重训或替换；对口径变更做对齐映射；对季节性特征加入时间哑变量。',
          code:
`# 漂移应对模板
high_psi = []
for col in feature_cols:
    p = psi(train[col], recent[col])
    if p > 0.25:
        high_psi.append((col, round(p, 3)))

if high_psi:
    print('需处理的高漂移特征:', high_psi)
    # 方案1: 重新训练该特征分箱边界
    # 方案2: 用替代特征替换
    # 方案3: 加入时间/渠道哑变量抵消结构变化`
        },
        {
          id: 'woeiv', title: 'WOE & IV 通用计算函数（推荐）', tag: 'IV',
          note: '相比逐类别统计，下面给出“自动分箱 + WOE + IV”通用函数：数值型用等频分箱，类别型直接分组（罕见类合并 Other），返回每个分箱的 WOE 与整体 IV，可直接复用于特征筛选。',
          code:
`def woe_iv_transform(df, col, target='y', bins=5, rare=0.05):
    """通用 WOE/IV 计算：自动处理数值/类别，返回 (分箱表, iv, woe映射)"""
    df = df.copy()
    # 类别型：罕见值合并为 'Other'，避免分箱过碎
    if df[col].dtype == object or df[col].nunique() <= 20:
        vc = df[col].value_counts(normalize=True)
        rare_cats = vc[vc < rare].index
        df[col] = df[col].replace(rare_cats, 'Other')
        df['bin'] = df[col].astype(str)
    else:
        df['bin'] = pd.qcut(df[col], bins, duplicates='drop')
    grp = df.groupby('bin', as_index=False).agg(
        tot=(target, 'count'), bad=(target, 'sum'))
    grp['good'] = grp['tot'] - grp['bad']
    grp['good_dist'] = (grp['good'] + 0.5) / (grp['good'].sum() + 0.5)
    grp['bad_dist']  = (grp['bad']  + 0.5) / (grp['bad'].sum()  + 0.5)
    grp['woe'] = np.log(grp['good_dist'] / grp['bad_dist'])
    grp['iv'] = (grp['good_dist'] - grp['bad_dist']) * grp['woe']
    grp = grp.sort_values('woe')
    iv = grp['iv'].sum()
    woe_map = dict(zip(grp['bin'].astype(str), grp['woe']))
    grp = grp.rename(columns={'bin': col + '_bin'})
    return grp, round(float(iv), 4), woe_map

# 用法：数值列自动等频分箱
table, iv, woe_map = woe_iv_transform(df, 'income', 'y', bins=5)
print('IV(income) =', iv)
df['income_woe'] = df['income'].astype(str).map(woe_map)
print(table)`
        }
      ]
    },
    {
      id: 'modeling', title: '信用评分卡 & LightGBM建模实战',
      desc: '标准评分卡流程 + LightGBM 违约预测 + 防泄露样本划分',
      sections: [
        {
          id: 'scorecard', title: '逻辑回归标准评分卡', tag: '评分卡',
          note: '评分卡把逻辑回归系数转换为“分值”。公式：Score = Offset + Factor × (Intercept + Σ WOE×β)。典型基准：600 分对应 odds=1/60，每 20 分翻倍。',
          code:
`from sklearn.linear_model import LogisticRegression

# 假设已把所有特征转为 WOE 编码
X = woe_df[woe_cols]
y = woe_df['y']

lr = LogisticRegression(C=0.1, max_iter=1000)
lr.fit(X, y)

# 评分卡参数
A, B = 600, 20 / np.log(2)   # 基准分与翻倍刻度
base = A - B * lr.intercept_[0]
score = base
for col, beta in zip(woe_cols, lr.coef_[0]):
    score += -B * beta * woe_df[col]   # 每个分箱的得分点

print('样本评分示例:', score.head())`
        },
        {
          id: 'lgbm', title: 'LightGBM 二分类违约预测', tag: 'LightGBM',
          note: 'LightGBM 适合大规模表格数据，训练快、精度高。用 early_stopping 防过拟合；类别/高基数特征可设 categorical_feature。',
          code:
`import lightgbm as lgb

train_set = lgb.Dataset(X_tr, y_tr)
val_set = lgb.Dataset(X_val, y_val, reference=train_set)

params = {
    'objective': 'binary',
    'metric': 'auc',
    'learning_rate': 0.05,
    'num_leaves': 31,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.8,
    'bagging_freq': 1,
    'verbose': -1
}
model = lgb.train(
    params, train_set, num_boost_round=1000,
    valid_sets=[val_set],
    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(0)])
print('验证集 AUC =', round(model.best_score['valid_0']['auc'], 4))`
        },
        {
          id: 'leakage', title: '样本划分规避数据泄露', tag: '评分卡',
          note: '信贷数据是时间序列，禁止随机切分！应“按时间切分”或“按客户分组切分”，否则未来信息泄漏进训练，线上必然崩。',
          code:
`from sklearn.model_selection import train_test_split

# 错误做法：随机切分会导致时间泄露
# X_tr, X_val = train_test_split(X, test_size=0.2)

# 正确做法：按时间切分（用更早的数据训练）
cut = '2020-06-30'
tr = df[df['apply_date'] <= cut]
val = df[df['apply_date'] > cut]

# 或按客户分组切分（同一客户不跨训练/验证）
from sklearn.model_selection import GroupShuffleSplit
gss = GroupShuffleSplit(n_splits=1, test_size=0.2)
tr_idx, val_idx = next(gss.split(X, y, groups=df['cust_id']))`
        }
      ]
    }
  ];

  /* 第6模块：项目笔记仓库（用户驱动，含标签检索 + 风控VS量化专区） */
  const REPO_MODULE = {
    id: 'repo', title: '模型评估与项目笔记仓库',
    desc: 'AUC/KS/混淆矩阵记录 + 标签检索 + 风控VS量化互通实验',
    sections: [
      { id: 'eval', title: 'AUC / KS / 混淆矩阵模板', tag: '评估',
        note: '模型上线前后都要记录评估指标。下面给出可直接运行的模板，配合“我的笔记”记录每次实验结果。',
        code:
`from sklearn.metrics import roc_auc_score, confusion_matrix

auc = roc_auc_score(y_true, y_prob)
print('AUC =', round(auc, 4))

# KS: 好坏样本累计分布差的最大值
def ks(y_true, y_prob):
    d = pd.DataFrame({'y': y_true, 'p': y_prob})
    d = d.sort_values('p')
    cum_good = (d.y == 0).cumsum() / (d.y == 0).sum()
    cum_bad = (d.y == 1).cumsum() / (d.y == 1).sum()
    return (cum_bad - cum_good).max()

print('KS =', round(ks(y_true, y_prob), 4))

# 混淆矩阵（取 0.5 阈值示例）
print(confusion_matrix(y_true, (y_prob > 0.5).astype(int)))` }
    ]
  };

  const ALL_MODULES = MODULES.concat([REPO_MODULE]);

  /* 模块分级标签（用于卡片/路线展示学习阶段） */
  const LEVEL = {
    'py-base': '入门', 'risk-concept': '入门',
    'feature': '核心', 'iv-psi': '核心',
    'modeling': '实战', 'repo': '评估'
  };

  /* 数据集资料（内置预设，固化进页面） */
  const DATASETS = [
    {
      name: 'UCI German Credit', src: 'UCI Machine Learning Repository',
      url: 'https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data',
      desc: '1000 条个人信贷数据，20 个属性 + 1 个好坏标签。经典教学数据集，适合练 WOE/IV 与评分卡。',
      code:
`import pandas as pd
# UCI German Credit：空格分隔的固定格式文件，末列为标签(1=好, 2=坏)
cols = ['chk_acct','duration','credit_history','purpose','amount','saving_acct',
        'employment','install_rate','personal','other_debtor','residence','property',
        'age','other_install','housing','existing_credit','job','num_depend',
        'telephone','foreign','good_bad']
url = 'https://archive.ics.uci.edu/ml/machine-learning-databases/statlog/german/german.data'
df = pd.read_csv(url, sep=' ', header=None, names=cols)
df['y'] = df['good_bad'].map({1: 0, 2: 1})   # 统一为坏=1
print(df.shape)
print(df['y'].value_counts())`
    },
    {
      name: 'Give Me Some Credit', src: 'Kaggle（需账号免费下载）',
      url: 'https://www.kaggle.com/c/GiveMeSomeCredit',
      desc: '约 15 万样本，目标预测未来两年是否发生重大财务困境。含缺失值，适合练数据清洗与 LightGBM。',
      code:
`import pandas as pd
# 文件需从 Kaggle 比赛页下载后解压到 ./data/ 目录
train = pd.read_csv('data/cs-training.csv')
print(train.shape)
print(train['SeriousDlqin2yrs'].value_counts())   # 目标：未来2年严重逾期
print(train.isnull().sum())                       # 缺失值概览

# 简单填充示例：月收入中位数填充
train['MonthlyIncome'] = train['MonthlyIncome'].fillna(train['MonthlyIncome'].median())
train['NumberOfDependents'] = train['NumberOfDependents'].fillna(0)`
    },
    {
      name: 'Home Credit Default Risk', src: 'Kaggle',
      url: 'https://www.kaggle.com/competitions/home-credit-default-risk',
      desc: '大规模真实信贷申请数据（含多张关联表），适合练特征工程与多表建模；注意表关联与数据泄露风险。',
      code:
`import pandas as pd
base = 'data/home-credit/'
app = pd.read_csv(base + 'application_train.csv')      # 主表：每客户一行
prev = pd.read_csv(base + 'previous_application.csv')  # 历史申请：同一客户多行

# 关联键：SK_ID_CURR（主表主键）/ SK_ID_PREV（历史表主键）
merged = app.merge(prev, on='SK_ID_CURR', how='left')
print(app.shape, prev.shape, merged.shape)
print(app['TARGET'].value_counts())                   # 目标列 TARGET`
    }
  ];

  /* 向 AI 获取数据集的快捷查询模板（纯文本，每段独立复制） */
  const DATA_TEMPLATES = [
    { label: '模板1｜查找新风控数据集（通用）',
      text:
`帮我找适合信贷风控建模练习的公开数据集，要求：可以练习WOE、IV、逻辑回归评分卡；输出：数据集名字、官方下载链接、pandas读取完整代码、数据集简单介绍，输出格式适配我的金融风控工作台数据集卡片。` },
    { label: '模板2｜指定已有数据集，获取全套资料',
      text:
`帮我整理【数据集名字】，输出：官方链接，python读取代码，字段说明，适合什么建模练习，把内容整理成可以粘贴进WorkBuddy工作台数据集资料模块的文本。` },
    { label: '模板3｜本地模拟生成风控样本（无需下载外部文件）',
      text:
`帮我生成一份模拟信贷样本数据的Python代码，样本5000条，包含年龄、收入、负债、逾期标签target，直接pandas生成，不需要外部文件，适合练习特征工程，代码可以复制到我的工作台代码片段库。` }
  ];

  /* 学习路线 */
  const PATH = [
    { t: 'Python 数据分析基础', d: '先把 pandas 缺失值/异常值清洗练熟，这是后面所有模块的底座。' },
    { t: '风控业务概念', d: '搞清好坏样本、观察/表现窗口、逾期定义，建立正确的标签观。' },
    { t: '数据清洗与特征工程', d: '掌握衍生特征与 WOE 分箱，让特征可被逻辑回归直接使用。' },
    { t: 'IV / PSI 稳定性', d: '学会衡量特征区分度与监控漂移，这是模型可上线的关键门槛。' },
    { t: '评分卡 & LightGBM', d: '完成标准评分卡与树模型两套实战，注意样本按时间切分。' },
    { t: '模型评估与笔记仓库', d: '用 AUC/KS 评估并记录每次实验，沉淀自己的项目笔记。' }
  ];

  /* ---------------- 状态与存储 ---------------- */
  const LS = {
    name: 'fw_name', theme: 'fw_theme',
    nav: 'fw_nav', notes: 'fw_notes', repo: 'fw_repo', pages: 'fw_pages',
    visited: 'fw_visited'
  };
  const DEFAULTS = {
    name: '金融风控建模学习工作台',
    theme: { name: '奶油绿', primary: '#8fd3a8', bg: '#f0f7f0', title: '#2f6b5e' }
  };

  /* 安全存储封装：file:// 或沙箱/隐私模式下 localStorage 可能抛 SecurityError，
     此时降级到内存对象，保证页面始终能打开、不崩溃。 */
  const _mem = {};
  function lsGet(key) {
    try { const v = localStorage.getItem(key); return v === null ? null : v; }
    catch (e) { return Object.prototype.hasOwnProperty.call(_mem, key) ? _mem[key] : null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, val); }
    catch (e) { _mem[key] = val; }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); } catch (e) { delete _mem[key]; }
  }

  function safeJSON(key, fallback) {
    try { const raw = lsGet(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }

  const state = {
    name: lsGet(LS.name) || DEFAULTS.name,
    theme: safeJSON(LS.theme, DEFAULTS.theme),
    nav: safeJSON(LS.nav, null),
    repo: safeJSON(LS.repo, []),
    pages: safeJSON(LS.pages, null),
    visited: safeJSON(LS.visited, {})
  };

  function save(key, val) { lsSet(key, typeof val === 'string' ? val : JSON.stringify(val)); }

  /* 模块一内置预设笔记：Python 字典排版语法要点 */
  const PRESET_PYBASE = `【模块一内置预设笔记】Python 字典排版语法要点

# 单条 K 线存为字典
bar = {
    "date": "2026-07-31",
    "open": 1520.00,
    "high": 1548.80,
    "low": 1511.20,
    "close": 1542.60,
    "volume": 32145,
}

# 字典语法要点
# 1. "date": 冒号后方最少保留 1 个空格；冒号后多个空格仅为视觉对齐美化，不属于强制语法。禁止紧贴书写 "date":"2026-07-31"。
# 2. 大括号 {} 换行后，内部全部键值对行首缩进空格数量必须统一，标准为 4 空格。
# 3. 键值对末尾逗号建议写上，后续新增行不容易报错。
# 4. 闭合大括号 } 单独另起一行，缩进和 bar = { 保持对齐。

# 字典组成列表（多条 K 线）示例
bars = [
    {"date": "2026-07-29", "open": 1520},
    {"date": "2026-07-30", "open": 1535},
]

# 取值
print(bar["close"])`;

  /* 数据迁移：旧版「按小节笔记」(notes 对象) 合并到按页笔记(pages) */
  (function migrate() {
    let dirty = false;
    if (!state.pages) {
      state.pages = {};
      try {
        const old = JSON.parse(lsGet(LS.notes) || '{}');
        if (old && typeof old === 'object') {
          Object.keys(old).forEach(k => {
            const page = k.split('::')[0];
            if (!state.pages[page] && old[k]) { state.pages[page] = { text: old[k], ts: Date.now() }; dirty = true; }
          });
        }
      } catch (e) {}
    }
    // 预置模块一笔记（仅当该页笔记从未设置时写入）
    if (!state.pages['py-base']) {
      state.pages['py-base'] = { text: PRESET_PYBASE, ts: Date.now() };
      dirty = true;
    }
    if (dirty) save(LS.pages, state.pages);
    state.repo.forEach(n => { if (!n.ts) n.ts = n.id || Date.now(); });
  })();

  /* ---------------- 主题应用 ---------------- */
  function applyTheme(t) {
    const root = document.documentElement.style;
    root.setProperty('--c-primary', t.primary);
    root.setProperty('--c-bg', t.bg);
    root.setProperty('--c-title', t.title);
    root.setProperty('--c-card', '#ffffff');
    root.setProperty('--c-sidebar', mix(t.bg, t.primary, 0.10));
    root.setProperty('--c-primary-soft', lighten(t.primary, 0.62));
    root.setProperty('--c-code-bg', lighten(t.primary, 0.82));
    root.setProperty('--c-border', lighten(t.primary, 0.74));
    const meta = $('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t.bg);
  }

  /* ---------------- 语法高亮（轻量 Python） ---------------- */
  const KW = new Set(('def return if elif else for while in import from as class try except finally ' +
    'with lambda and or not is None True False print pass break continue yield global assert raise ' +
    'del await async').split(' '));
  const BUILTIN = new Set(('len range list dict set tuple str int float bool sum min max sorted ' +
    'enumerate zip map filter abs round type isinstance open format np pd').split(' '));

  function highlight(code) {
    const re = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tok-n">' + esc(m[3]) + '</span>';
      else if (m[4]) {
        const w = m[4];
        if (KW.has(w)) out += '<span class="tok-k">' + esc(w) + '</span>';
        else if (BUILTIN.has(w)) out += '<span class="tok-b">' + esc(w) + '</span>';
        else out += esc(w);
      }
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return out;
  }

  function codeBlock(code, lang) {
    return `<div class="code-wrap">
      <div class="code-head"><span class="lang">${lang || 'python'}</span>
        <button class="copy-btn" data-copy>复制</button></div>
      <pre class="code"><code>${highlight(code)}</code></pre></div>`;
  }

  /* 外部链接：静态页无法直接跳转，展示完整地址并提供复制按钮 */
  function linkRow(url) {
    return `<div class="link-row">
      <span class="link-url">${esc(url)}</span>
      <button class="copy-btn" data-link="${esc(url)}">复制链接</button>
    </div>`;
  }

  /* 文本模板块：纯文本（非代码），每段独立一键复制，用于 AI 查询模板 */
  function tplBlock(label, text) {
    return `<div class="code-wrap">
      <div class="code-head"><span class="lang">${esc(label)}</span>
        <button class="copy-btn" data-text="${escAttr(text)}">复制</button></div>
      <pre class="code"><code>${esc(text)}</code></pre></div>`;
  }

  /* ---------------- 导航 ---------------- */
  function getNavOrder() {
    const base = ['home'].concat(ALL_MODULES.map(m => m.id));
    if (state.nav && state.nav.length === base.length && state.nav[0] === 'home') return state.nav;
    return base;
  }
  function moduleById(id) { return ALL_MODULES.find(m => m.id === id); }
  function sidebarItem(id) {
    if (id === 'home') return { id: 'home', title: '首页' };
    return moduleById(id);
  }

  function renderNav() {
    const list = $('#navList');
    list.innerHTML = '';
    getNavOrder().forEach(id => {
      const m = sidebarItem(id);
      if (!m) return;
      const el = document.createElement('div');
      el.className = 'nav-item' + (currentView === id ? ' active' : '');
      el.dataset.id = id;
      el.innerHTML = `<span class="nav-label">${esc(m.title)}</span><span class="drag-h">⠿</span>`;
      el.addEventListener('click', () => {
        if (id === 'home') openView('home');
        else openModule(id);
        closeSidebar();
      });
      attachDrag(el, list);
      list.appendChild(el);
    });
  }

  /* 长按拖拽排序（指针事件，兼容触屏与鼠标） */
  function attachDrag(el, list) {
    let timer = null, dragging = false, startY = 0, pid = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('drag-h') || true) {
        startY = e.clientY; pid = e.pointerId;
        timer = setTimeout(() => {
          dragging = true;
          el.classList.add('dragging');
          try { el.setPointerCapture(pid); } catch (_) {}
        }, 420);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const els = $$('.nav-item', list);
      const target = els.find(t => {
        const r = t.getBoundingClientRect();
        return e.clientY > r.top && e.clientY < r.bottom && t !== el;
      });
      if (target) {
        const rect = el.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) list.insertBefore(el, target);
        else list.insertBefore(el, target.nextSibling);
      }
    });
    const end = () => {
      clearTimeout(timer);
      if (dragging) {
        dragging = false;
        el.classList.remove('dragging');
        const order = $$('.nav-item', list).map(n => n.dataset.id);
        state.nav = order; save(LS.nav, order);
        toast('导航顺序已保存');
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /* ---------------- 视图渲染 ---------------- */
  let currentView = 'home';

  function trackVisit(id) {
    if (!state.visited[id]) {
      state.visited[id] = true;
      save(LS.visited, state.visited);
    }
  }

  function openModule(id) {
    currentView = id;
    trackVisit(id);
    renderNav(); renderBottomNav();
    renderContent();
  }
  function openView(v) {
    currentView = v;
    const m = moduleById(v);
    if (m) trackVisit(v);
    renderNav(); renderBottomNav();
    renderContent();
    if (typeof window.scrollTo === 'function') { try { window.scrollTo(0, 0); } catch (e) {} }
  }
  function renderBottomNav() {
    $$('.bn-item').forEach(b => {
      const on = b.dataset.view === currentView;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
  }

  function renderContent() {
    const c = $('#content');
    if (currentView === 'home') return renderHome(c);
    if (currentView === 'codelib') return renderCodeLib(c);
    if (currentView === 'path') return renderPath(c);
    if (currentView === 'data') return renderData(c);
    const m = moduleById(currentView);
    if (m) return m.id === 'repo' ? renderRepo(c, m) : renderModule(c, m);
  }

  /* 模块元信息：小节数 / 代码数 / 是否已有笔记 */
  function moduleMeta(m) {
    const secs = m.sections ? m.sections.length : 0;
    const codes = m.sections ? m.sections.filter(s => s.code).length : 0;
    const pg = state.pages[m.id];
    const notes = (pg && pg.text && pg.text.trim()) ? 1 : 0;
    return { secs, codes, notes };
  }

  /* 首页学习路线进度条：已访问模块自动标记 */
  function renderRoute() {
    const ids = ALL_MODULES.map(m => m.id);
    return ids.map((id, i) => {
      const m = moduleById(id);
      const done = !!state.visited[id];
      const lvl = LEVEL[id] || '';
      const arrow = i < ids.length - 1 ? '<span class="route-arrow" aria-hidden="true">›</span>' : '';
      return `<div class="route-node ${done ? 'done' : ''}" data-go="${id}" role="button" tabindex="0" aria-label="${(done ? '已学习' : '未学习')}：${esc(m.title)}（${lvl}）">
          <span class="route-dot">${i + 1}</span>
          <span class="route-lvl">${esc(lvl)}</span>
          <span class="route-name">${esc(m.title)}</span>
        </div>${arrow}`;
    }).join('');
  }

  function renderHome(c) {
    const routeDone = ALL_MODULES.filter(m => state.visited[m.id]).length;
    const cards = ALL_MODULES.map(m => {
      const lvl = LEVEL[m.id] || '';
      const done = !!state.visited[m.id];
      const { secs, codes, notes } = moduleMeta(m);
      return `<div class="mod-card" data-id="${m.id}" role="button" tabindex="0" aria-label="进入 ${esc(m.title)}，共 ${secs} 个小节、${codes} 段代码">
        <div class="mc-top">
          <span class="mc-level lvl-${esc(lvl)}">${esc(lvl)}</span>
          ${done ? '<span class="mc-done">已学习</span>' : '<span class="mc-todo">未开始</span>'}
        </div>
        <div class="mc-title">${esc(m.title)}</div>
        <div class="mc-desc">${esc(m.desc)}</div>
        <div class="mc-meta">${secs} 小节 · ${codes} 段代码${notes ? ' · 已记笔记' : ''}</div>
        <div class="mc-foot"><span class="mc-enter">进入学习 ›</span></div>
      </div>`;
    }).join('');
    c.innerHTML = `
      <div class="hero">
        <div class="hero-status">学习路线进度 ${routeDone}/${ALL_MODULES.length}</div>
        <h1>${esc(state.name)}</h1>
        <p>欢迎回来。建议从「Python 数据分析通用基础」按顺序推进，每完成一个模块，下方路线会自动标记进度。</p>
      </div>
      <div class="card route-card">
        <h2 class="section-title">学习路线 <span class="badge">点击节点直达</span></h2>
        <div class="route">${renderRoute()}</div>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="num">${ALL_MODULES.length}</div><div class="lbl">学习模块</div></div>
        <div class="stat clickable" data-stat="codelib" role="button" tabindex="0" aria-label="查看代码片段库（${countCodes()} 段代码）"><div class="num">${countCodes()}</div><div class="lbl">可运行代码 ›</div></div>
        <div class="stat clickable" data-stat="repo" role="button" tabindex="0" aria-label="查看我的笔记（${pageNoteCount() + state.repo.length} 条）"><div class="num">${pageNoteCount() + state.repo.length}</div><div class="lbl">我的笔记 ›</div></div>
        <div class="stat"><div class="num">${storageUsedKB()} KB</div><div class="lbl">本地存储容量</div></div>
      </div>
      <div class="card">
        <h2 class="section-title">学习模块 <span class="badge">点击进入</span></h2>
        <div class="mod-grid">${cards}</div>
      </div>
      <div class="card">
        <h2 class="section-title">快捷入口</h2>
        <div class="quick-links">
          <button class="qlink" data-go="codelib">代码片段库</button>
          <button class="qlink" data-go="path">学习路线</button>
          <button class="qlink" data-go="data">数据集资料</button>
          <button class="qlink" data-go="repo">笔记仓库</button>
        </div>
      </div>`;
    $$('.mod-card', c).forEach(el => {
      const go = () => openModule(el.dataset.id);
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $$('.route-node', c).forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModule(el.dataset.go); } });
    });
    $$('[data-go]', c).forEach(b => b.addEventListener('click', () => openView(b.dataset.go)));
    $$('[data-stat]', c).forEach(b => {
      const go = () => openView(b.dataset.stat);
      b.addEventListener('click', go);
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function countCodes() {
    let n = 0;
    ALL_MODULES.forEach(m => (m.sections || []).forEach(s => { if (s.code) n++; }));
    return n;
  }

  function pageNoteCount() {
    return Object.keys(state.pages).filter(k => state.pages[k] && state.pages[k].text && state.pages[k].text.trim()).length;
  }

  function storageUsedKB() {
    let bytes = 0;
    [LS.name, LS.theme, LS.nav, LS.notes, LS.repo, LS.pages].forEach(k => {
      const v = lsGet(k);
      if (v) bytes += v.length * 2; // UTF-16
    });
    return (bytes / 1024).toFixed(1);
  }

  function renderModule(c, m) {
    const secs = m.sections.map(s => `
      <div class="card">
        <h2 class="section-title">${esc(s.title)} <span class="badge">${esc(s.tag || '')}</span></h2>
        ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
        ${s.code ? codeBlock(s.code, 'python') : ''}
      </div>`).join('');
    const lvl = LEVEL[m.id] || '';
    c.innerHTML = `<h1 class="view-title">${esc(m.title)}${lvl ? ` <span class="view-level">${esc(lvl)}</span>` : ''}</h1>
      <p class="view-sub">${esc(m.desc)}</p>${secs}${pageNotePanel(m.id)}`;
    bindCopy(c);
    bindPageNotes(c);
  }

  /* 全页通用笔记模式：页底输入区，实时自动保存，与仓库互通 */
  function pageNotePanel(pageId, placeholder) {
    const p = state.pages[pageId] || {};
    const text = p.text || '';
    return `<div class="card page-notes">
      <h2 class="section-title">本页笔记 <span class="badge">实时自动保存</span></h2>
      <p class="note muted">记录学习心得、错题复盘或实验记录，输入即保存、无需手动点击；可在「模型评估与项目笔记仓库」中按日期检索并与全站互通。</p>
      <textarea data-pagenote="${pageId}" placeholder="${escAttr(placeholder || '在此记录本页笔记…')}">${esc(text)}</textarea>
    </div>`;
  }
  function bindPageNotes(c) {
    $$('textarea[data-pagenote]', c).forEach(ta => {
      ta.addEventListener('input', () => {
        const id = ta.dataset.pagenote;
        if (!state.pages[id]) state.pages[id] = {};
        state.pages[id].text = ta.value;
        state.pages[id].ts = Date.now();
        save(LS.pages, state.pages);
      });
    });
  }

  function renderRepo(c, m) {
    const evalSec = m.sections[0];
    c.innerHTML = `<h1 class="view-title">模型评估与项目笔记仓库 <span class="view-level">评估</span></h1>
      <p class="view-sub">记录 AUC/KS/混淆矩阵实验结果；全站各页笔记在此按日期检索互通；并设「风控 VS 量化」技术互通专区。</p>
      <div class="card">
        <h2 class="section-title">${esc(evalSec.title)} <span class="badge">${esc(evalSec.tag)}</span></h2>
        <p class="note">${esc(evalSec.note)}</p>
        ${codeBlock(evalSec.code, 'python')}
      </div>
      <div class="card">
        <h2 class="section-title">新建结构化笔记</h2>
        <div class="note-editor">
          <input type="text" id="noteTitle" placeholder="笔记标题，如：LightGBM 第3次实验" />
          <div>
            <span class="muted" style="font-size:12px">标签：</span>
            <button class="tag" data-tag="WOE分箱">WOE分箱</button>
            <button class="tag" data-tag="评分卡">评分卡</button>
            <button class="tag" data-tag="LightGBM">LightGBM</button>
            <button class="tag" data-tag="互通" data-zone="inter">风控VS量化</button>
          </div>
          <textarea id="noteBody" placeholder="记录实验设置、指标结果与结论…"></textarea>
          <button class="btn primary" id="addNote" style="justify-self:start">保存到仓库</button>
        </div>
      </div>
      <div class="card">
        <h2 class="section-title">全部笔记（按日期 · 互通检索）</h2>
        <div class="search-box">
          <input type="text" id="repoSearch" placeholder="按标题 / 内容 / 标签搜索…" />
          <span class="muted" style="font-size:12px">筛选：</span>
          <button class="tag on" data-filter="all">全部</button>
          <button class="tag" data-filter="WOE分箱">WOE分箱</button>
          <button class="tag" data-filter="评分卡">评分卡</button>
          <button class="tag" data-filter="LightGBM">LightGBM</button>
          <button class="tag" data-filter="inter">风控VS量化</button>
        </div>
        <div id="repoList"></div>
      </div>`;
    bindRepo(c);
    renderRepoList(c, '', 'all');
  }

  function renderCodeLib(c) {
    let blocks = '';
    ALL_MODULES.forEach(m => (m.sections || []).forEach(s => {
      if (s.code) blocks += `<div class="card">
        <h2 class="section-title">${esc(m.title)} · ${esc(s.title)}</h2>
        ${codeBlock(s.code, 'python')}</div>`;
    }));
    c.innerHTML = `<h1 class="view-title">代码片段库</h1>
      <p class="view-sub">汇集全部模块可直接运行的代码，点击「复制」即可粘贴到本地练习。</p>${blocks}`;
  }

  function renderPath(c) {
    const steps = PATH.map((p, i) => `<div class="path-step">
      <div class="path-dot">${i + 1}</div>
      <div class="path-body"><h4>${esc(p.t)}</h4><p>${esc(p.d)}</p></div></div>`).join('');
    c.innerHTML = `<h1 class="view-title">学习路线</h1>
      <p class="view-sub">建议按顺序推进，每一步都为下一步打基础。</p>
      <div class="card">${steps}</div>`;
  }

  function renderData(c) {
    const items = DATASETS.map(d => `
      <div class="ds-item">
        <h4>${esc(d.name)}</h4>
        <div class="src">来源：${esc(d.src)}</div>
        <p>${esc(d.desc)}</p>
        ${linkRow(d.url)}
        ${codeBlock(d.code, 'python')}
      </div>`).join('');
    const tpls = DATA_TEMPLATES.map(t => tplBlock(t.label, t.text)).join('');
    c.innerHTML = `<h1 class="view-title">数据集资料</h1>
      <p class="view-sub">以下均为公开教学数据集，仅用于练习。下载后注意脱敏与合规，禁止用于真实授信。</p>
      <div class="card notice">
        <p class="note">本工作台属于静态本地应用，受浏览器跨域限制，无法自动联网实时同步、下载外部数据库。</p>
        <p class="note">获取新数据集方式：复制下方「AI 查询数据集模板」发给 AI 助手，拿到数据集介绍、官方链接、Python 读取代码，复制保存到下方笔记区域，代码存入代码片段库；需要最新版本数据，请复制链接 / 代码手动运行获取。</p>
      </div>
      <div class="card">
        <h2 class="section-title">向 AI 获取数据集 · 快捷查询模板 <span class="badge">点复制后粘贴给 AI</span></h2>
        <p class="note muted">每段模板独立配备「复制」按钮，按需复制发送给 AI，即可获取数据集全套资料；代码可存入代码片段库，资料可写入下方笔记区。</p>
        ${tpls}
      </div>
      <div class="card">
        <h2 class="section-title">内置教学数据集</h2>
        <p class="note muted">卡片下方「复制链接」获取地址、「复制」获取读取代码，均为一键复制。</p>
        ${items}
      </div>
      ${pageNotePanel('data', '记录数据集新版本链接、更新时间、版本备注…')}`;
    bindCopy(c);
    bindPageNotes(c);
  }

  /* ---------------- 笔记编辑与仓库（统一互通） ---------------- */
  const PAGE_TITLE = { data: '数据集资料' };

  function getAllNotes() {
    const arr = [];
    Object.keys(state.pages).forEach(k => {
      const p = state.pages[k];
      if (p && p.text && p.text.trim()) {
        const m = moduleById(k);
        const title = PAGE_TITLE[k] || (m ? m.title : k);
        arr.push({ kind: 'page', page: k, title, body: p.text, tags: [], zone: 'main', ts: p.ts || 0 });
      }
    });
    state.repo.forEach(n => arr.push({
      kind: 'repo', id: n.id, title: n.title, body: n.body,
      tags: n.tags || [], zone: n.zone || 'main', ts: n.ts || n.id || 0
    }));
    return arr;
  }

  function bindRepo(c) {
    bindCopy(c);
    const selTags = new Set();
    $$('.tag[data-tag]', c).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.zone === 'inter') { selTags.clear(); selTags.add('互通'); }
      else {
        const t = b.dataset.tag;
        selTags.has(t) ? selTags.delete(t) : selTags.add(t);
      }
      b.classList.toggle('on');
    }));
    $('#addNote', c).addEventListener('click', () => {
      const title = $('#noteTitle', c).value.trim();
      const body = $('#noteBody', c).value.trim();
      if (!title || !body) { toast('请填写标题与内容'); return; }
      const tags = Array.from(selTags);
      const zone = tags.includes('互通') ? 'inter' : 'main';
      state.repo.unshift({
        id: Date.now(), ts: Date.now(), title, body,
        tags: zone === 'inter' ? ['风控VS量化'] : tags, zone
      });
      save(LS.repo, state.repo);
      $('#noteTitle', c).value = ''; $('#noteBody', c).value = '';
      selTags.clear(); $$('.tag[data-tag]', c).forEach(b => b.classList.remove('on'));
      renderRepoList(c, $('#repoSearch', c).value, currentFilter);
      toast('已保存到仓库');
    });
    $('#repoSearch', c).addEventListener('input', e => renderRepoList(c, e.target.value, currentFilter));
    $$('.tag[data-filter]', c).forEach(b => b.addEventListener('click', () => {
      currentFilter = b.dataset.filter;
      $$('.tag[data-filter]', c).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      renderRepoList(c, $('#repoSearch', c).value, currentFilter);
    }));
  }

  let currentFilter = 'all';

  function renderRepoList(c, kw, filter) {
    kw = (kw || '').trim().toLowerCase();
    let list = getAllNotes();
    if (filter !== 'all') {
      list = list.filter(n => filter === 'inter' ? n.zone === 'inter' : (n.tags || []).includes(filter));
    }
    if (kw) list = list.filter(n => (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(kw));
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const box = $('#repoList', c);
    if (!list.length) { box.innerHTML = `<p class="muted">暂无匹配笔记，去上方或各模块页面新建一条吧。</p>`; return; }
    const groups = {};
    list.forEach(n => {
      const d = new Date(n.ts || Date.now()).toLocaleDateString('zh-CN');
      (groups[d] = groups[d] || []).push(n);
    });
    const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    box.innerHTML = dates.map(d => `
      <div class="note-date">${esc(d)} <span class="muted">(${groups[d].length})</span></div>
      ${groups[d].map(n => {
        const tags = (n.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
        const src = n.kind === 'page' ? `<span class="badge">本页笔记·${esc(n.title)}</span>` : '';
        const head = n.kind === 'page' ? ('【' + esc(n.title) + '】页笔记') : esc(n.title);
        return `<div class="note-card">
          <h4>${head}</h4>
          <div class="meta">${tags}${src}</div>
          <div class="body">${esc(n.body)}</div>
          ${n.kind === 'repo' ? `<div class="note-actions"><button class="mini-btn" data-del="${n.id}">删除</button></div>` : ''}
        </div>`;
      }).join('')}
    `).join('');
    $$('[data-del]', box).forEach(b => b.addEventListener('click', () => {
      state.repo = state.repo.filter(x => x.id != b.dataset.del);
      save(LS.repo, state.repo);
      renderRepoList(c, kw, filter);
      toast('已删除');
    }));
  }

  function bindCopy(c) {
    $$('[data-copy]', c).forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.closest('.code-wrap').querySelector('code').textContent;
        const done = () => { btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制', 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
        } else fallbackCopy(code, done);
      });
    });
    $$('[data-link]', c).forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.link;
        const done = () => { btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制链接', 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
        } else fallbackCopy(url, done);
      });
    });
    $$('[data-text]', c).forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        const done = () => { btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制', 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        } else fallbackCopy(text, done);
      });
    });
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }

  /* ---------------- 侧边栏（手机抽屉） ---------------- */
  function openSidebar() { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); }
  function closeSidebar() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }

  /* ---------------- 网络状态 ---------------- */
  function updateNet() {
    const on = navigator.onLine;
    const el = $('#netStatus');
    el.classList.toggle('offline', !on);
    $('#netText').textContent = on ? '已联网' : '离线';
  }

  /* ---------------- 设置弹窗 ---------------- */
  function openSettings() {
    $('#setName').value = state.name;
    renderThemeGrid();
    $('#setColorHex').value = state.theme.primary.toUpperCase();
    $('#setColor').value = state.theme.primary;
    $('#settingsModal').classList.add('open');
    $('#settingsScrim').style.display = 'block';
  }
  function closeSettings() {
    $('#settingsModal').classList.remove('open');
    $('#settingsScrim').style.display = 'none';
  }

  function renderThemeGrid() {
    const g = $('#themeGrid');
    g.innerHTML = THEMES.map(t =>
      `<button data-i="${THEMES.indexOf(t)}" class="${t.primary === state.theme.primary ? 'on' : ''}" style="background:${t.primary}"></button>`).join('');
    $$('button', g).forEach(b => b.addEventListener('click', () => {
      const t = THEMES[+b.dataset.i];
      state.theme = { name: t.name, primary: t.primary, bg: t.bg, title: t.title };
      applyTheme(state.theme);
      $('#setColorHex').value = t.primary.toUpperCase();
      $('#setColor').value = t.primary;
      $$('button', g).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      save(LS.theme, state.theme);
    }));
  }

  function applyIdentity() {
    $('#brandName').textContent = state.name;
    document.title = state.name;
  }

  function applyCustomColor(hex) {
    hex = hex.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return;
    if (hex[0] !== '#') hex = '#' + hex;
    const title = darken(hex, 0.45);
    const bg = lighten(hex, 0.86);
    state.theme = { name: '自定义', primary: hex, bg, title };
    applyTheme(state.theme);
    save(LS.theme, state.theme);
    $$('#themeGrid button').forEach(x => x.classList.remove('on'));
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    applyTheme(state.theme);
    applyIdentity();
    updateNet();
    $('#brandDate').textContent = new Date().toLocaleDateString('zh-CN',
      { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    renderNav();
    renderBottomNav();
    renderContent();

    // 顶栏
    $('#gearBtn').addEventListener('click', openSettings);

    // 底部导航
    $$('.bn-item').forEach(b => b.addEventListener('click', () => openView(b.dataset.view)));

    // 设置弹窗
    $('#settingsCancel').addEventListener('click', closeSettings);
    $('#settingsScrim').addEventListener('click', closeSettings);
    $('#settingsSave').addEventListener('click', () => { closeSettings(); toast('设置已保存'); });
    $('#setName').addEventListener('input', (e) => {
      state.name = e.target.value || DEFAULTS.name;
      applyIdentity(); save(LS.name, state.name);
    });
    $('#setColorHex').addEventListener('input', (e) => applyCustomColor(e.target.value));
    $('#setColor').addEventListener('input', (e) => {
      $('#setColorHex').value = e.target.value.toUpperCase();
      applyCustomColor(e.target.value);
    });

    // 网络状态监听
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);

    // 免责声明收起 / 展开
    const disc = $('#disclaimer');
    $('#discToggle').addEventListener('click', () => {
      const collapsed = disc.classList.toggle('collapsed');
      $('#discToggle').textContent = collapsed ? '展开' : '收起';
      $('#discToggle').setAttribute('aria-label', collapsed ? '展开免责声明' : '收起免责声明');
      document.documentElement.style.setProperty('--disclaimer-h', collapsed ? '34px' : '34px');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
