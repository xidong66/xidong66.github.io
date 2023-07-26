# Linux Cheatsheet

## File Management

```
# Using  SCP Transfer
	- scp -P 2322  file.txt   calvchen@10.224.10.10:/home/calvchen/

# Folder Accesibility
	- chmod 755 function.sh --- rwx = 4 + 2 + 1
	
# Count Files under directory
	- ls | wc -l
	
# Folder Size
	- du -sh *   # or 
	- du -h --max-depth=1
	
# Find files not end with sth
	- find . -not -name "*.jpg"
	
# Find command
	- which or whereis
	
```

### Rename Files in Batch

```markdown
# atb_mod_01.cpp  atb_mod_02.cpp  atb_mod_03.cpp  atb_mod_04.cpp
rename mod adb *  #
# atb_adb_01.cpp  atb_adb_02.cpp  atb_adb_03.cpp  atb_adb_04.cpp
```



## Vim

### vim + filename

```
I  --  Edit mode
:  --  Command          # e.g. :wq
    q --  exit
    w -- reserve

o  -- insert a blank line in view mode

gg -- Move the first line
G  -- Move the last line

d  -- Delete mode       # e.g. ggdG
y  -- Copy mode         # e.g. ggyG, copy the selected content to cache
yy -- Copy whole line   # 3yy for copy 3 lines
p  -- Paste

/ -- find text, n(next), N(last)
	/hello\>  --- find start with hello
	/^hello   --- find head of the line
	/world$   --- find end of the line

u -- undo
Ctrl + r -- Redo (not confirmed)
```

### Shift/ Move  Cursor

```
w --- next word
b --- last word
CTRL + a --- first word
CTRL + e --- end word

)(       --- move by sentense

CTRL + w --- delete the left word
CTRL + k --- clean the word to the right

SHIFT + PageUp/ PageDwon

fx - jump to the previous occurrence of character x
Fx - jump to the previous occurrence of character x
```



## Linux Command

```
# Find cmd history
	- CTRL + r
  
# Diff files
	# -y indicates parallel display, -W for the display width
  	- diff log2014.log log2013.log  -b -B -H -y -W 50

# Generate SSH
	- ssh-keygen
```

### Grep / save to text

```
# find files with string inside
	- grep -r "string" dir 
	
# Search by tag
	- grep MYDEBUG file1 file2 -r | grep -v TAG
	
# find conditions and save to files
	- grep -E "some thing|some other thing" origin.txt  >> target.txt
```



## Env Control

```
# User Env
	- vim ~/.bashrc --- check env variable 

# Make Alias
	- vim ~/.bashrc
	- alias home="cd /home/calvchen"
	- source ~/.bashrc


```

### 

## Zip and Unzip

```markdown
# zip
# Handling Zip Bomb
zip -FF 210211.zip --out 210211-2.zip -fz
# tar
tar --jcv -f filename.tar.bz2 文件 压缩
tar -jxv -f file.tar.bz2 -C 解压缩
tar -jtv -f 文件  查看

```

