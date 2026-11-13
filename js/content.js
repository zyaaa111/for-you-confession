const memoryLine = "我记得那些和你说话、分享日常，也一起笑起来的时刻。";
const firstPlan = "找一个不赶时间的下午，一起散步、吃饭，好好说说话。";

window.CONFESSION_CONTENT = {
  recipientName: "",
  senderName: "",
  memoryLine,
  firstPlan,
  defaultRecipient: "致珍贵的你",
  defaultSignature: "来自一个想认真对待你的人",
  scenes: {
    opening: {
      eyebrow: "第一幕 · 想认真告诉你",
      title: "有些喜欢，想认真说给你听",
      paragraphs: [
        "有些放在心里很久的话，今天不想再用玩笑带过去。我想认真地说给你听。不用赶，慢慢看。"
      ]
    },
    meeting: {
      eyebrow: "第二幕 · 想起初见",
      title: "有些喜欢，是慢慢变得清楚",
      paragraphs: [
        "第一次见到你时，我并没有立刻想到以后。只是后来，在很多普通的瞬间里，我会忽然想起那天的你。现在回头看，有些喜欢不是突然发生，而是在一次次想起里，慢慢变得清楚。"
      ]
    },
    together: {
      eyebrow: "第三幕 · 和你相处的时光",
      title: "普通的瞬间，也很珍贵",
      paragraphs: [
        `${memoryLine}它们算不上轰轰烈烈，却让我一次次确认：和你相处的时光，我很珍惜。和你相处时，我可以放松地做自己，也越来越想认真了解真实的你。`
      ]
    },
    confession: {
      eyebrow: "第四幕 · 认真告白",
      title: "我喜欢你。",
      paragraphs: [
        "不是只想把这三个字说得动听，而是想把它放进以后的行动里。我不能保证每一天都完美，但会认真对待你的信任，也认真对待我们。"
      ]
    },
    ring: {
      eyebrow: "一份小小的心意",
      title: "把这份心意郑重地交给你",
      intro: "所以，今天想用一点小小的仪式感，把这份心意郑重地交给你。",
      openLabel: "打开这份心意",
      revealed: "这枚戒指，不急着替未来下定义，也不要求你用答案交换。它只代表：我对你的喜欢是认真的，而你的选择，同样重要。"
    },
    response: {
      title: "我喜欢你。你愿意做我女朋友吗？",
      assurance: "如果愿意，我们就认真开始；如果还没准备好，也不必勉强自己。",
      acceptLabel: "我愿意",
      declineLabel: "不愿意"
    },
    accepted: {
      eyebrow: "今天，值得记住",
      title: "那就，从今天开始吧。",
      paragraphs: [
        "谢谢你愿意回应我的喜欢。今天不是故事的结尾，而是我们认真了解彼此、一起创造回忆的开始。"
      ],
      dateLabel: "我们认真开始的日子：",
      planLabel: "我们的第一件小事："
    },
    declined: {
      eyebrow: "你的感受，同样重要",
      title: "谢谢你的诚实",
      paragraphs: [
        "谢谢你认真看完，也谢谢你诚实回应。你不需要为真实的想法道歉。我会尊重你的选择，不会让这份喜欢成为打扰。"
      ]
    }
  },
  music: {
    title: "今天你要嫁给我",
    hint: "背景音乐是《今天你要嫁给我》。若浏览器阻止自动播放，请点“播放音乐”；音乐不会循环播放。",
    playLabel: "播放音乐",
    error: "音乐暂时无法播放，告白仍会继续",
    officialLabel: "去官方平台收听《今天你要嫁给我》",
    officialUrl: "https://www.kugou.com/song-36/70y3b7.html?from_360"
  }
};
