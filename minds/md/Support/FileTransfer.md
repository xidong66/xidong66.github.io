## MAC +sshfs

To mount remote folder locally requires:

- MacFUSE
- sshfs

Both can be download from: https://osxfuse.github.io/

![MacFuse-sshfs-mount-remote-folder-01](https://xmanyou.com/content/images/2021/02/MacFuse-sshfs-mount-remote-folder-01.png)

Or try:

```
brew install sshfs
```

### Command

mount the remote folder

```
sshfs <user>@<server>:<path> <local folder> -ovolname=<rename folder>
```

unmount the remote folder

```
umount <rename folder>
```



## WIN +sshfs

requires the following: 

```
- sshfs-win：https://github.com/billziss-gh/sshfs-win/releases
- winfsp：https://github.com/billziss-gh/winfsp/releases
- SSHFS-Win Manager：https://github.com/evsar3/sshfs-win-manager/releases (GUI，可选)
```

### Connection A:

Open the GUI and Add Connection

Recommend to open “*Startup with windows*”

<img src="https://cdn.jsdelivr.net/gh/xieqk/blog-cdn@master/imgs/image-20201108112233090.png#pic_center" alt="添加连接" style="zoom:50%;" />



## Remote Mount By System GUI

![映射网络驱动器](https://cdn.jsdelivr.net/gh/xieqk/blog-cdn/imgs/win-sshfs.png#pic_center)

![输入 sshfs 路径](https://cdn.jsdelivr.net/gh/xieqk/blog-cdn/imgs/win-sshfs-2.png#pic_center)