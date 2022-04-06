%lang starknet

from starkware.cairo.common.uint256 import Uint256

@contract_interface
namespace IERC20:
    func name() -> (name : felt):
    end

    func symbol() -> (symbol : felt):
    end

    func decimals() -> (decimals : felt):
    end

    func totalSupply() -> (totalSupply : Uint256):
    end

    func balanceOf(account : felt) -> (balance : Uint256):
    end

    func allowance(owner : felt, spender : felt) -> (remaining : Uint256):
    end

    func transfer(recipient : felt, amount : Uint256) -> (success : felt):
    end

    func transferFrom(sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
    end

    func approve(spender : felt, amount : Uint256) -> (success : felt):
    end
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
end
=======
end
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
end
>>>>>>> e1ebfe9... Formatting
=======
end
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
