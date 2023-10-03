# GIT

## Account Management

```
# Git Authentication with CLI
	- conda install gh --channel conda-forge
	- gh auth login

# Git asking repeatedly entering psw
	- git config --global credential.helper store

```

## Git Status

```
# No showing untracked files
	- git status -uno

# Pull remote branch
	- git branch -r | grep name
```



## Commit Management

```
# Retreat commit 
	- git reset --soft HEAD^n
	
# give up modification
	- git reset --hard HEAD~1

# Check commits history
	- git log --oneline        # 

# squash commits into one
	- git log --graph --decorate --pretty=oneline --abbrev-commit    # to print all the commits
	
	
# Combine commits into one
	- git rebase -i bb0c9c2    # combine till this commit, in interactive mode
	
        # ===============
        pick 382a2a5 add database settings
        squash cd82f29 add cat 1
        pick 1de2076 add cat 2

        # Change to
        # ===============
        pick 382a2a5 add database settings
        pick cd82f29 add cat 1
        pick 1de2076 add cat 2
        
# Amend commits and Force push local commits
	- git commit --amend 
	- git push -f              # "force local branch commit to cover the remote commit"

# If you have merge commits in your history, you may need to use the --preserve-merges option with the git rebase

```

### Git Rebase

```
git rebase -i HEAD~3 
git rebase --onto master 76cada^
```

### Git Stash

```
git stash push -m "my_stash_name"
git stash apply stash^{/my_stash_name}

```

```
git stash apply + version
```

### Merge

![image-20221220103924736](C:\Users\calvchen\AppData\Roaming\Typora\typora-user-images\image-20221220103924736.png)

```
git mergetool
```

### Find Git History 

```
git log --pretty=oneline --follow filename  --- 显示某个文件的修改历史，加上--follow后即使文件被移动过也可以查看历史
```

### Time Out

```
git config --global http.proxy 127.0.0.1:7890
git config --global https.proxy 127.0.0.1:7890
```

### 
