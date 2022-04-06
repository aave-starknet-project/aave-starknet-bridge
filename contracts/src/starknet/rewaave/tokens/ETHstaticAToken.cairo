%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
from starkware.cairo.common.uint256 import Uint256, uint256_le
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math_cmp import is_le

from openzeppelin.token.erc20.library import (
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner, Ownable_get_owner

from openzeppelin.utils.constants import TRUE

from rewaave.tokens.claimable import (
    claimable_claim_rewards, claimable_push_acc_rewards_per_token, claimable_before_token_transfer,
    claimable_get_acc_rewards_per_token)
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9

@contract_interface
namespace ITokenBridge:
    func mint_rewards(recipient : felt, amount : Uint256):
    end
end

@storage_var
func l2_token_bridge() -> (address : felt):
end

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        controller : felt, l2_token_bridge_ : felt):
    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(controller)
    l2_token_bridge.write(l2_token_bridge_)
    # TODO we either need to configure the last_update here, or pause the contract
    # until the first update somehow.
    # Actually we can just rely on the first bridger to give us the right rewards!
    return ()
end

@storage_var
func last_update() -> (block_number : felt):
end

<<<<<<< HEAD
=======
from starkware.cairo.common.uint256 import Uint256
=======
from starkware.cairo.common.uint256 import Uint256, uint256_le
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
from starkware.starknet.common.syscalls import get_caller_address
from starkware.cairo.common.math_cmp import is_le

from openzeppelin.token.erc20.library import (
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner, Ownable_get_owner

from openzeppelin.utils.constants import TRUE

from rewaave.tokens.claimable import (
    claimable_claim_rewards, claimable_push_accRewardsPerToken, claimable_before_token_transfer,
    claimable_get_accRewardsPerToken)
=======
>>>>>>> 31bc890... Snake case take 2

@constructor
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        controller : felt):
    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(controller)
    # TODO we either need to configure the last_update here, or pause the contract
    # until the first update somehow.
    # Actually we can just rely on the first bridger to give us the right rewards!
    return ()
end

<<<<<<< HEAD
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
@storage_var
func last_update() -> (block_number : felt):
end

>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
#
# Getters
#

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
=======
func name{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (name: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
>>>>>>> e1ebfe9... Formatting
=======
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (name) = ERC20_name()
    return (name)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
=======
func symbol{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (symbol: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
>>>>>>> e1ebfe9... Formatting
=======
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (symbol) = ERC20_symbol()
    return (symbol)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
=======
func totalSupply{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (totalSupply: Uint256):
    let (totalSupply: Uint256) = ERC20_totalSupply()
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
>>>>>>> e1ebfe9... Formatting
=======
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (totalSupply)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
=======
func decimals{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (decimals: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
>>>>>>> e1ebfe9... Formatting
=======
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (decimals) = ERC20_decimals()
    return (decimals)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
=======
func balanceOf{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(account: felt) -> (balance: Uint256):
    let (balance: Uint256) = ERC20_balanceOf(account)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
>>>>>>> e1ebfe9... Formatting
=======
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (balance)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
=======
func allowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(owner: felt, spender: felt) -> (remaining: Uint256):
    let (remaining: Uint256) = ERC20_allowance(owner, spender)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
>>>>>>> e1ebfe9... Formatting
=======
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (remaining)
end

#
# Externals
#

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
    let (from_) = get_caller_address()
    claimable_before_token_transfer(from_, recipient)
<<<<<<< HEAD
<<<<<<< HEAD
=======
func transfer{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(recipient: felt, amount: Uint256) -> (success: felt):
=======
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
    let (from_) = get_caller_address()
<<<<<<< HEAD
    ERC20_claimable_beforeTokenTransfer(from_, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
    ERC20_claimable_before_token_transfer(from_, recipient)
>>>>>>> 44b0dab... Church of snakecase
=======
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
<<<<<<< HEAD
    claimable_before_token_transfer(sender, recipient)
=======
func transferFrom{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        sender: felt, 
        recipient: felt, 
        amount: Uint256
    ) -> (success: felt):
=======
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
<<<<<<< HEAD
>>>>>>> e1ebfe9... Formatting
    ERC20_claimable_beforeTokenTransfer(sender, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
    ERC20_claimable_before_token_transfer(sender, recipient)
>>>>>>> 44b0dab... Church of snakecase
=======
    claimable_before_token_transfer(sender, recipient)
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
=======
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
    claimable_before_token_transfer(sender, recipient)
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
=======
func approve{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, amount: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
=======
func increaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, added_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
=======
func decreaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, subtracted_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
    Ownable_only_owner()
    claimable_before_token_transfer(0, recipient)
<<<<<<< HEAD
<<<<<<< HEAD
=======
func mint{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(recipient: felt, amount: Uint256):
=======
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256):
>>>>>>> e1ebfe9... Formatting
    Ownable_only_owner()
<<<<<<< HEAD
    ERC20_claimable_beforeTokenTransfer(0, recipient)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
    ERC20_claimable_before_token_transfer(0, recipient)
>>>>>>> 44b0dab... Church of snakecase
=======
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_mint(recipient, amount)
    return ()
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        user : felt, recipient : felt) -> (success : felt):
    let (caller) = get_caller_address()

    with_attr error_message("user address should be {caller}"):
        assert caller = user
    end
    let (rewards) = claimable_claim_rewards(user, recipient)
    ITokenBridge.mint_rewards(l2_token_bridge, recipient, rewards)
    return (TRUE)
end

@external
func push_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        block : felt, acc_rewards_per_token : Uint256):
    alloc_locals
    Ownable_only_owner()
    let (last_block) = last_update.read()
    let (le) = is_le(last_block, block - 1)
    if le == 1:
        let (prev_acc) = claimable_get_acc_rewards_per_token()
        let (le) = uint256_le(prev_acc, acc_rewards_per_token)
        if le == 1:
            last_update.write(block)
            claimable_push_acc_rewards_per_token(acc_rewards_per_token)
            return ()
        else:
            return ()
        end
    else:
        return ()
    end
end

@external
func get_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        ) -> (acc_rewards_per_token : Uint256):
    return claimable_get_acc_rewards_per_token()
end
<<<<<<< HEAD
=======
func claimRewards{
    syscall_ptr : felt*, 
    pedersen_ptr : HashBuiltin*,
    range_check_ptr
}(user: felt, recipient: felt) -> (claimed: Uint256):
  Ownable_only_owner()
  return ERC20_claimable_claimRewards(user, recipient)
=======
func claimRewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
=======
func claim_rewards{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
>>>>>>> 31bc890... Snake case take 2
        user : felt, recipient : felt) -> (claimed : Uint256):
    Ownable_only_owner()
<<<<<<< HEAD
<<<<<<< HEAD
    return ERC20_claimable_claimRewards(user, recipient)
>>>>>>> e1ebfe9... Formatting
=======
    return ERC20_claimable_claim_rewards(user, recipient)
>>>>>>> 44b0dab... Church of snakecase
=======
    return claimable_claim_rewards(user, recipient)
>>>>>>> c20e50d... Implement some tests, add getter for rewards per token, fix update preconditions
end

@external
func push_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        block : felt, acc_rewards_per_token : Uint256):
    alloc_locals
    Ownable_only_owner()
    let (last_block) = last_update.read()
    let (le) = is_le(last_block, block - 1)
    if le == 1:
        let (prev_acc) = claimable_get_acc_rewards_per_token()
        let (le) = uint256_le(prev_acc, acc_rewards_per_token)
        if le == 1:
            last_update.write(block)
            claimable_push_acc_rewards_per_token(acc_rewards_per_token)
            return ()
        else:
            return ()
        end
    else:
        return ()
    end
end

@external
func get_acc_rewards_per_token{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        ) -> (acc_rewards_per_token : Uint256):
    return claimable_get_acc_rewards_per_token()
end
<<<<<<< HEAD

>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
>>>>>>> e1ebfe9... Formatting
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
